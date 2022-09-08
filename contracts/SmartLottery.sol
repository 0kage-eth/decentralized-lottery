//SPDX-License-Identifier:MIT

pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "./DateTime.sol";
import "hardhat/console.sol";

contract SmartLottery is VRFConsumerBaseV2, KeeperCompatibleInterface, DateTime {
    // using SearchList for address[];
 
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

    // lottery duration in hours
    uint64 private s_duration;

    // lottery end time of current epoch
    uint256 private s_lotteryEndTimestamp;

    // starts at 0 at genesis
    uint32 private s_epoch;

    // protocol fee charged in basis points (1 bp = 0.01%) 
    uint32 private s_platformFee;

    // platform balance of total fees since last drawdown
    // this is sum of all commissions since first epoch minus sum of all drawdowns since first epoch
    uint256 private s_cumulativeBalance;

    // max players allowed to participant in given epocj
    uint64 private s_maxPlayers;

    // each player can have a cap on max tickets 
    uint32 private s_maxTicketsPerPlayer;

    // lottery ticket fee in eth per ticket to be charged from players
    uint256 private s_lotteryFee;

    // unclaimed winner balances are stored here
    // when a winner withdraws his proceeds, mapping will be deleted
    mapping(address => uint256) s_winnerBalances;

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
        s_owner = payable(msg.sender);
        s_lotteryFee = 0.1 ether;
        s_duration = 24;
        s_maxTicketsPerPlayer = 100;

        setLotteryStartAndEndTime(block.timestamp);

    }

    // Modifiers
    modifier OnlyOwner(){
        require(msg.sender == s_owner, "Only owner has access!");
        _;
    }

    modifier Open(){
        require(s_status == LotteryStatus.open, "Lottery should be open!");
        _;
    }

    modifier Closed(){
        require(s_status == LotteryStatus.closed, "Lottery should be closed!");
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
    function transferOwnership(address payable _newOwner) public OnlyOwner {
        s_owner = _newOwner;
    }

    /**
     * @dev Owner can change lottery duration for the next epoch
     * @dev Duration will always be in hours - and next start cycle is always 30 mins after current end cycle
     */
     function changeDuration(uint8 _durationInHours) public OnlyOwner Closed{
        s_duration = _durationInHours;
     }

     /**
      * @dev Owner can change lottery fee from next epoch
      * @dev Fee is in basis points (0.01% = 1 bp)
      */
     function changeFee (uint32 _newFeeInBasisPoints ) public OnlyOwner Closed{
        s_platformFee = _newFeeInBasisPoints;
     }

     /**
      * @dev Cap on players
      * @dev Owner can change max players from next epoch
      */
     function changeMaxPlayers(uint64 _maxPlayers) public OnlyOwner Closed{
        s_maxPlayers = _maxPlayers;  
     }

     function changeMaxTicketsPerPlayer(uint32 _ticketsPerPlayer) public OnlyOwner Closed{
        s_maxTicketsPerPlayer = _ticketsPerPlayer;
     }

     function stopLottery() public OnlyOwner{
        s_status = LotteryStatus.closed;
     }

     function startLottery() public OnlyOwner{
        s_status = LotteryStatus.open;
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
            revert SmartLottery__MaxTicketLimit(s_addressToNumTicketsMap[msg.sender], s_maxTicketsPerPlayer);
        }

        // check if correct fee is sent by user (numtickets * lotteryFee)
        if(msg.value != _numTickets * s_lotteryFee){
            revert SmartLottery__InsufficientFunds(msg.value, _numTickets*s_lotteryFee);
        }

        // update tickets to given address
        s_addressToNumTicketsMap[msg.sender] += _numTickets;

        // if address is not in existing player list, update address array
        if(indexOfAddress(msg.sender) == type(uint256).max){
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

        // updating cumulative balance
        // every time a new player comes in, platform accrues a fee
        s_cumulativeBalance += s_platformFee * msg.value / 10000;

        emit NewEntry(msg.sender, s_lotteryValue, s_ticketCtr, s_players.length);
    }


    /******************** KEEPER FUNCTIONS ********************/
    /**
     * @notice Function to check upkeep - if duration of lottery has ended
     * @dev we use ChainLink KeeperCompatibleInterface for this
     */
    function checkUpkeep(bytes calldata /* checkData */)external override view returns(bool upkeepNeeded, bytes memory /*performData*/ ){

        // check if current time exceeds end time and lottery status is open
        if(block.timestamp > s_lotteryEndTimestamp && s_status == LotteryStatus.open){
            upkeepNeeded = true;
        }
        else{
            upkeepNeeded = false;
        }

    }

    /**
     * @notice performUpkeep - this is a Chainlink keeper function that executes when checkUpkeep function returns true
     * @dev this is performed by network of Chainlink keepers and not performed by us internally
     * @dev it is recommended by Chainlink team to always perform check in checkUpkeep before doing performUpkeep
     */

    function performUpkeep(bytes calldata /* performData */) external override {

        // Check if current time exceeds end time and lottery status is open
        // This indicates that lottery has ended 
        // Set status to close, update start time for next lottery and initiate settlement
        if(block.timestamp > s_lotteryEndTimestamp && s_status == LotteryStatus.open){
            
            // close lottery
            s_status = LotteryStatus.closed;

            // select a winner at random and reset lottery to begin a new one
            announceWinner();
        }

    }


    /********************** SETTLE LOTTERY **********************/
    /**
     * @dev winner will be announced 
     * @dev all proceeds will go to the winner
     * @dev protocol will charge a settlement fee
     */
    function announceWinner() public Closed{


        // request random words
        console.log("key has %s", string(abi.encodePacked(i_keyHash)));
        console.log("sub id %s", i_subscriptionId);
       console.log("confirmations %s", i_confirmations);
       console.log("callback gas limit %s", i_callbackGasLimit);
       console.log("num words", i_numWords);

        uint256 requestId = i_vrfCoordinator.requestRandomWords(i_keyHash, i_subscriptionId, i_confirmations, i_callbackGasLimit, i_numWords);
        emit CloseLottery(requestId);
    }

    /**
     * @dev chainlink function that is overwritten to execute closeLottery()
     * @dev by this step, we get random number that helps in picking a winner
     */
    function fulfillRandomWords(uint256, uint256[] memory _randomWords) internal override{

        // normalize random number  - and make it between 0 & s_ticketCtr
        // using modulo operator to generate a number between 0 and s_ticketCtr
        uint256 winnerIndx = _randomWords[0] % s_ticketCtr;

        // once we get winner Index, we get back einner address from s_ticketidToAddressMap mapping
        address winnerAddress = s_ticketidToAddressMap[winnerIndx];

        // emmitting WinnerAnnounced event
        emit WinnerAnnounced(winnerAddress, s_cumulativeBalance, s_lotteryValue );

        // Once winner announced, reset all mappings

        // reset all tickets to 0 for addresses that participated
        for (uint256 i=0; i< s_players.length; i++){
            delete s_addressToNumTicketsMap[s_players[i]];
        }

        // reset all addresses to null address
        for (uint256 i=0; i< s_ticketCtr; i++){
            delete s_ticketidToAddressMap[i];
        }

        // reset ticket counter to 0
        s_ticketCtr = 0;

        // reset lottery value to 0
        s_lotteryValue = 0;

        // reset s_players to 0 array
        delete s_players;

        // set lottery status as open
        s_status = LotteryStatus.open;

        // set epoch counter to +1
        s_epoch += 1;

        // set new start and end lottery time
        // sending a timestamp 1 minutes ahead of endtimestamp -> this forces the start time to be atleast 1 minute away from end time
        setLotteryStartAndEndTime(s_lotteryEndTimestamp + 1 minutes);

    }

    /**
     * @notice function allows anyone to withdraw proceeds, provided he was winner in previous epochs
     * @notice as a best practice, we never automatically transfer funds - funds are to be pulled out by winner
     * @dev check if winner balance exists, if it does, a transfer is initiated from contract address
     * 
     */
    function withdrawWinnerProceeds() external payable{
        if(s_winnerBalances[msg.sender] > 0){
            uint256 winnerBalance = s_winnerBalances[msg.sender];
            s_winnerBalances[msg.sender] = 0; // pushing it to zero before actual transfer to avoid re-entrancy attacks

            (bool success, ) = msg.sender.call{value: winnerBalance}("");
            if(!success){
                revert SmartLottery__TransferFailed(winnerBalance);
            }
        }
    }

    /****************** WITHDRAW PLATFORM FEES ************* */
    /**
     * @notice this function is used to withdraw platform fees from contract
     * @notice note that withdrawal can only be done when no lottery is active
     * @dev withdrawal should never touch user deposits 
     */
     function withdrawPlatformFees() public OnlyOwner { 

        //  uint256 platformBalance = address(this).balance;
        uint256 balance = s_cumulativeBalance;
        
        // set it to 0 to prevent re-entrancy attacks
        s_cumulativeBalance = 0;

        // transfer cumulative balance out of the address balance
        (bool success, ) = s_owner.call{value: balance}("");
        if(!success){
            revert SmartLottery__TransferFailed(balance);
        }
        emit Withdrawal( balance, s_owner);

     }

    /*************** HELPER FUNCTIONS ********************/

    function indexOfAddress(address input) public view returns (uint256){
        for(uint256 indx=0; indx<s_players.length;indx++){
            if (s_players[indx] == input){
                return indx;
            }
        }
        return type(uint256).max;
    }

    /**
     * @dev resets start and end time for lottery
     */
    function setLotteryStartAndEndTime(uint256 currentTimeStamp) private {
        uint8 creationMonth = getMonth(currentTimeStamp);
        uint8 creationDay = getDay(currentTimeStamp);
        uint16 creationYear = getYear(currentTimeStamp);


        // take current day's last second to start the lottery
        s_lotteryStartTimestamp = toTimestamp(creationYear, creationMonth, creationDay, 23, 59, 59);

        // console.log("start time %s", s_lotteryStartTimestamp);
        // console.log("time diff %s",  1 hours);
        // console.log("duration %s",  s_duration);
        // //set end time as duration hours more than start time stamp
        s_lotteryEndTimestamp = s_lotteryStartTimestamp + s_duration * 1 hours;
    }

    // Get functions
    
    // gets status
    function getStatus() public view returns(LotteryStatus status){
        status = s_status;
    }

    // gets lottery start time stamp
    function getStartTime() public view returns(uint256 start){
        start = s_lotteryStartTimestamp;
    }

    // gets lottery end time stamp
    function getEndTime() public view returns(uint256 end){
        end = s_lotteryEndTimestamp;
    }

    // gets lottery duration
    function getDuration() public view returns(uint64 duration){
        duration = s_duration;
    }

    // gets epoch number
    function getEpoch() public view returns(uint32 epoch){
        epoch = s_epoch;
    }

    // gets platform fee in bps (1 bp = 0.01%)
    function getPlatformFee() public view returns(uint32 platformFee){
        platformFee = s_platformFee;
    }

    // gets max players
    function getMaxPlayers() public view returns(uint64 maxPlayers){
        maxPlayers = s_maxPlayers;
    }

    /**
     * @dev returns lottery fee
     */
    function getLotteryFee() public view returns(uint256 lotteryFees){
        lotteryFees = s_lotteryFee;
    }

    /**
     * @dev returns lottery value
     */
    function getLotteryValue() public view returns(uint256 lotteryValue){
        lotteryValue = s_lotteryValue;
    }

    /**
     * @dev returns cumulative balance
     */
    function getCumulativePlatformBalance() public view returns(uint256 cumulativeBalance){
        cumulativeBalance = s_cumulativeBalance;
    }

    /**
     * @dev returns owner for ticket id
     */
    function getOwnerForTicketId(uint256 id) public view returns(address owner){
        owner = s_ticketidToAddressMap[id];
    }   

    /**
     * @dev returns num tickets
     */
    function getNumTickets() public view returns(uint64 tickets){
        tickets = s_addressToNumTicketsMap[msg.sender];
    }

    function getTotalTicketsIssued() public view returns(uint256 total){
        total = s_ticketCtr;
    }

    /**
     * @dev returns list of players
     */
    function getPlayers() public view returns(uint256 players){
        players = s_players.length;
    }

    function getMaxTicketsPerPlayer() public view returns(uint32 maxTicketsPerPlayer){
        maxTicketsPerPlayer = s_maxTicketsPerPlayer;
    }

    function getVRFContract() public view returns(VRFCoordinatorV2Interface vrf){
        return i_vrfCoordinator;
    }

    function getContractOwner() public view returns(address owner){
        return s_owner;
    }

}



// library SearchList {
    
//     function indexOfAddress(address[] storage self, address input) public view returns (uint256){
//         for(uint256 indx=0; indx<self.length;indx++){
//             if (self[indx] == input){
//                 return indx;
//             }
//         }
//         return type(uint256).max;
//     }
// }