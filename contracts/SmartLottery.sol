//SPDX-License-Identifier:MIT

pragma solidity ^0.8.7;



contract SmartLottery{

    struct PlayerInfo{
        address players;
        uint256 betSize;
    }

    // Storage variables
    address private s_owner;

    // status -> true if lottery is ongoing, false -> if lottery is closed
    // lottery will be closed from current epoch end time to next epoch start time
    bool public s_status;

    // lottery start time of current epoch
    uint256 private s_lotteryStartTimestamp;

    // lottery end time of current epoch
    uint256 private s_lotteryEndTimestamp;

    // starts at 0 at genesis
    uint32 private s_epoch;

    // protocol fee charged in basis points (1 bp = 0.01%) 
    uint32 private s_fee;

    // mapping of epoch with winner address
    mapping(uint256 => PlayerInfo) s_winners;

    // players in the current epoch
    mapping(address => uint256) s_players;
    
    // Events
    event WinnerAnnounced(address winner, uint256 reward);
    event LotteryBegins(uint256 timestamp);
    event LotteryEnds(uint256 timestamp);
    event LotteryPaused(uint256 timestamp);
    event LotteryRestart(uint256 timestamp);



    // Errors

    // Constructor
    constructor(){

    }

    // Modifiers
    modifier onlyOwner(){
        require(msg.sender == s_owner, "Only owner has access!");
        _;
    }

    modifier onOpen(){
        require(s_status, "Lottery closed currently!");
        _;
    }

    modifier onClosed(){
        require(!s_status, "Lottery currently active!");
        _;
    }

    // Set functions
    function TransferOwnership(address _newOwner) public onlyOwner{

    }

    /**
     * @dev owner can pause lottery in execeptional circumstances
     * @dev on pausing, current epoch will close without a winner
     * @dev all participants will get a refund of their bet amount
     * @dev there will be no fee charged in this scenario 
     */
    function pauseLottery() public onlyOwner onOpen{

    }

    function restartLottery() public onlyOwner onClosed{

    }

    /**
     * @dev winner will be announced 
     * @dev all proceeds will go to the winner
     * @dev protocol will charge a settlement fee
     */
    function Settle() public onClosed{

    } 


    // Get functions


}