// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 < 0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CrowdFunding is Ownable{

    //data fields
    uint duration;
    uint minimumContribution;
    uint minimumTarget;
    uint pollNumber = 0;
    bool isVotingOpen = false;
    uint amount;
    uint public numberOfContributers = 0;
    uint public numberOfYesses = 0;
    
    event pollStarted (uint indexed pollNumber, string indexed notion , uint indexed amount);
    event Received(address, uint);
    
    mapping(uint256 => mapping(address => bool)) private polls;
    mapping(address => uint) contributors;

    constructor(uint _duration, uint _minimumContribution, uint _minimumTarget) {
        duration = block.timestamp + _duration;
        minimumContribution = _minimumContribution;
        minimumTarget = _minimumTarget;
    }

    //method
    function hasDeadlinePassed() view public returns(bool) {
        if (block.timestamp > duration) {
            return true;
        }
        return false;
    }

    function contribute() payable public {
        require(msg.sender != owner(), "the manager cannot contribute");
        require(!hasDeadlinePassed(), "deadline has passed, contributions are closed");
        require(minimumContribution <= msg.value, "contribution lower than minimum contribution");
        emit Received(msg.sender, msg.value);
        contributors[msg.sender] += msg.value;
        numberOfContributers += 1;
    }

    function seeContribution (address _address) view public returns(uint) {
        return contributors[_address];
    }

    function recoverContribution() public payable{
        require(hasDeadlinePassed(), "deadline has not passed, contributions cannot be recovered rightnow");
        require((address(this).balance < minimumTarget || numberOfContributers < 3), "target has been met, cannot recover contributions now or more than three contributors");
        require(contributors[msg.sender] != 0, "you have not contributed anything");
        /*
        payable(msg.sender).transfer(_amount);
        contributors[msg.sender] = 0;
        -------------------------------------
        this causes a security issue (reentrancy) because we are maintainig a record AFTER calling an external contract's function
         */
        uint _amount = contributors[msg.sender];
        contributors[msg.sender] = 0;
        payable(msg.sender).transfer(_amount);
    }

    function openPoll(string memory _notion, uint _amount) public onlyOwner {
        require(hasDeadlinePassed(), "deadline has not passed");
        require(isVotingOpen == false, "previous poll has not been closed yet");
        require(numberOfContributers >= 3, "insufficient contributers");
        isVotingOpen = true;
        emit pollStarted (pollNumber, _notion, _amount);
        amount = _amount;
    }

    function _endPoll () internal {
        require(isVotingOpen == true, "new poll has not been started");
        isVotingOpen = false;
        pollNumber += 1;
    }

    function withdrawAmount() public onlyOwner returns(bool) {
        require(hasDeadlinePassed(), "deadline has not passed");
        _endPoll();
        uint poll = (numberOfYesses * 100) / numberOfContributers;
        numberOfYesses = 0;
        amount = 0;
        if(poll >= 50){
            payable(owner()).transfer(amount);
            return true;
        } else {
            return false;
        } 
    }

    function vote() public {
        require(isVotingOpen == true, "poll has not started");
        require(msg.sender != owner(), "the manager cannot vote");
        require(contributors[msg.sender] != 0, "you have not contributed anything, not eligible to vote");
        require(polls[pollNumber][msg.sender] == false, "you have already voted");
        polls[pollNumber][msg.sender] = true;
        numberOfYesses += 1;
        
    }

    function balance(address _address) view public returns(uint) {
        return _address.balance;
    }

}