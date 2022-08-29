//SPDX-License-Identifier:MIT

pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract SmartLottery is VRFConsumerBaseV2{
    using SearchList for address[];
    enum LotteryStatus{
        open,
        closed
    }


    VRFCoordinatorV2Interface private immutable  i_vrfCoordinator;
  
    // Storage variables
    address payable private s_owner;

    // status ->status can have three states - open, close
    // lottery will be closed from current epoch end time to next epoch start time
    LotteryStatus public s_status;

    // lottery start time of current epoch
    uint256 private s_lotteryStartTimestamp;

    // lottery end time of current epoch
    uint256 private s_lotteryEndTimestamp;

    // starts at 0 at genesis
    uint32 private s_epoch;

    // protocol fee charged in basis points (1 bp = 0.01%) 
    uint32 private s_platformFee;

    // max players allowed to participant in given epocj
    uint64 private s_maxPlayers;

    // each player can have a cap on max tickets 
    uint32 private s_maxTicketsPerPlayer;

    // lottery ticket fee in eth per ticket to be charged from players
    uint256 private s_lotteryFee;

    // lottery duration in days
    uint8 private s_duration;

    // platform balance of total fees since last drawdown
    // this is sum of all commissions since first epoch minus sum of all drawdowns since first epoch
    uint256 private s_cumulativeBalance;

    // mapping of every ticket id issues in the current epoch to its address
    // Incase of multiple tickets help by single address, multiple ids will map to same address
    mapping(uint256 => address) s_ticketidToAddressMap;


    // maps address to total number of tickets bought in current epoch
    mapping(address => uint64) s_addressToNumTicketsMap;

    // lottery value of current epoch
    uint256 private s_lotteryValue;

    // lottery tickets counter to keep track of # of tickets distributed in current epoch
    // same address taking 10 tickets will add 
    uint64 private s_ticketCtr;

    // list of players who have participated thus far in the current epoch
    address[] private s_players;

    //VRF specific variables
    bytes32 immutable private i_keyHash; // gas lane for chainlink
    uint64 immutable private i_subscriptionId; // subscription id for chainlink VRF. If you don't have one, create a subscription id at https://vrf.chain.link/
    uint16 immutable private i_confirmations; // number of block confirmations
    uint32 immutable private i_numWords; // typically we need only 1 random number to be generated
    uint32 immutable private i_callbackGasLimit; // callback gas limit

    uint256[] public s_randomWords; // random words - for this example, we only need an array of size 1
    uint256 private s_requestId; //request Id generated when we call requestRandomwords

    
    // Events
    event NewEntry(address player, uint256 lotteryBalance, uint256 lotteryTickets, uint256 totalPlayers);
    event WinnerAnnounced(address winner, uint256 reward, uint256 fee);
    event Withdrawal(uint256 amount, address recepient);
    event CloseLottery(uint256 requestId);
    event LotteryBegins(uint256 timestamp);
    event LotteryEnds(uint256 timestamp);
    event LotteryPaused(uint256 timestamp);
    event LotteryRestart(uint256 timestamp);


    // Errors
    error SmartLottery_BelowMinimumPurchase();
    error SmartLottery__InsufficientFunds(uint256 sentAmt, uint256 expectedAmt);
    error SmartLottery__MaxPlayerLimit(uint64 players);
    error SmartLottery__MaxTicketLimit(uint64 existing, uint64 limit);
    error SmartLottery__TransferFailed(uint256 fee);


    // Constructor
    constructor(address _vrfCoordinator, bytes32 _keyHash, uint64 _subscriptionId, uint16 _numConfirmations, uint32 _numWords, uint32 _callbackGasLimit) VRFConsumerBaseV2(_vrfCoordinator) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_keyHash = _keyHash;
        i_subscriptionId = _subscriptionId;
        i_confirmations = _numConfirmations;
        i_numWords = _numWords;
        i_callbackGasLimit = _callbackGasLimit;
        s_maxPlayers = type(uint64).max - 1;
        s_platformFee = 50; // charge 50 bps (0.5% as fee)
    }

    // Modifiers
    modifier onlyOwner(){
        require(msg.sender == s_owner, "Only owner has access!");
        _;
    }

    modifier canOpen(){
        require(s_status != LotteryStatus.open, "Lottery open already!");
        _;
    }

    modifier canClose(){
        require(s_status != LotteryStatus.closed, "Lottery closed already!");
        _;
    }



    // *********** ADMIN FUNCTIONS ************** //
    // admin functions can only be accessed by contract owner
    // key functions - transfer contract ownership, change lottery duration, change platform fee.
     // change max players, change lotteryTicketFee, change maxTicketsPerPlayer


    /**
     * @notice function to be called when ownership needs to be transferred
     * @dev changing ownership means that new owner can withdraw platform fees to their address
     * @dev also owner can change platform parameters such as max players, ticket limit etc
     */
    function transferOwnership(address payable _newOwner) public onlyOwner {
        s_owner = _newOwner;
    }

    /**
     * @dev Owner can change lottery duration for the next epoch
     * @dev Duration will always be in days - and start is always 00:00:00 UTC and end is always 23:30:00 UTC
     */
     function changeDuration(uint8 _durationInDays) public onlyOwner canOpen{
        s_duration = _durationInDays;
     }

     /**
      * @dev Owner can change lottery fee from next epoch
      * @dev Fee is in basis points (0.01% = 1 bp)
      */
     function changeFee (uint32 _newFeeInBasisPoints ) public onlyOwner canOpen{
        s_platformFee = _newFeeInBasisPoints;
     }

     /**
      * @dev Cap on players
      * @dev Owner can change max players from next epoch
      */
     function changeMaxPlayers(uint64 _maxPlayers) public onlyOwner canOpen{
        s_maxPlayers = _maxPlayers;
     }


    /**
     * @notice this function is used to withdraw platform fees from contract
     * @notice note that withdrawal can only be done when no lottery is active
     * @dev withdrawal should never touch user deposits 
     */
     function withdrawPlatformFees() public onlyOwner canOpen { 

        uint256 platformBalance = address(this).balance;
        (bool success, ) = s_owner.call{value: address(this).balance}("");
        if(!success){
            revert SmartLottery__TransferFailed(address(this).balance);
        }
        emit Withdrawal( platformBalance, s_owner);

     }


    /******************** ADMIN FUNCTIONS END HERE ************* */


    /******************* ENTER LOTTERY **********************/

    /**
     * @notice Function accessed by users to enter lottery
     * @dev things to do in this function
     * @dev add user to player mapping 
     */
    function enterLottery(uint32 _numTickets) public payable {

        // atleast 1 ticket should be bought when calling this function
        if(_numTickets<1){
            revert SmartLottery_BelowMinimumPurchase();
        }
        // check if player limit hit
        if(s_players.length == s_maxPlayers){
            revert SmartLottery__MaxPlayerLimit(s_maxPlayers);
        }

        // check if current player does not exceed ticket limit if current tickets are added
        if(s_addressToNumTicketsMap[msg.sender] + _numTickets > s_maxTicketsPerPlayer){
            revert SmartLottery__MaxTicketLimit(_numTickets, s_maxTicketsPerPlayer);
        }

        // check if correct fee is sent by user (numtickets * lotteryFee)
        if(msg.value != _numTickets * s_lotteryFee){
            revert SmartLottery__InsufficientFunds(msg.value, _numTickets*s_lotteryFee);
        }

        // update tickets to given address
        s_addressToNumTicketsMap[msg.sender] += _numTickets;

        // if address is not in existing player list, update address array
        if(s_players.indexOfAddress(msg.sender) == type(uint256).max){
            s_players.push(msg.sender);
        }

        // update ticket id to address mapping
        // loop to handle multiple ticket purchase    
        for(uint32 i=0; i< _numTickets; i++){
            s_ticketidToAddressMap[s_ticketCtr] = msg.sender;
            s_ticketCtr++;
        }

        //updating lottery value
        s_lotteryValue += msg.value;

        emit NewEntry(msg.sender, s_lotteryValue, s_ticketCtr, s_players.length);
    }


    /**
     * @dev winner will be announced 
     * @dev all proceeds will go to the winner
     * @dev protocol will charge a settlement fee
     */
    function closeLotteryAndAnnounceWinner() public canClose{

        // close lottery
        s_status = LotteryStatus.closed;

        // request random words

        s_requestId = i_vrfCoordinator.requestRandomWords(i_keyHash, i_subscriptionId, i_confirmations, i_callbackGasLimit, i_numWords);
        emit CloseLottery(s_requestId);
    }


    // Get functions
    function fulfillRandomWords(uint256, uint256[] memory _randomWords) internal override{
        s_randomWords= _randomWords;

        // normalize random number  - and make it between 0 & s_ticketCtr
        // using modulo operator to generate a number between 0 and s_ticketCtr
        uint256 winnerIndx = s_randomWords[0] % s_ticketCtr;

        // once we get winner Index, we get back einner address from s_ticketidToAddressMap mapping
        address winnerAddress = s_ticketidToAddressMap[winnerIndx];

        // emmitting WinnerAnnounced event
        emit WinnerAnnounced(winnerAddress, s_cumulativeBalance, s_lotteryValue );

    }

}

library SearchList {
    
    function indexOfAddress(address[] storage self, address input) public view returns (uint256){
        for(uint256 indx=0; indx<self.length;indx++){
            if (self[indx] == input){
                return indx;
            }
        }
        return type(uint256).max;
    }
}