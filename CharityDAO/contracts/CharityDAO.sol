// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 < 0.9.0;

import "./DAOToken.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CharityDAO
 * @author Hareem Saad
 * @notice This contract can be used for a DAO that oversees charity proccedings
 * @dev there is no time constraint the proposal is ended when the creator of the proposal ends it
 * @dev currently there is no function to update the price of ether
 */

contract CharityDAO is ReentrancyGuard{
    Comet public cometAddress;
    uint256 public price = 0.5 ether;
    uint256 proposalNumber = 0;

    event declareProposal (uint256 indexed proposalNumber, string notion, address indexed from, uint256 amount, address indexed to);
    event transfer(address indexed recipient, bytes data);

    struct Proposal {
        address creator;
        address reciever;
        uint256 votes;
        uint256 amount;
        bool isActive;
    }

    mapping (uint256 => Proposal) proposals;
    mapping (uint256 => mapping(address => bool)) hasVoted;

    constructor() {
        cometAddress = new Comet(address(this));
    }

    /**
     * @notice mints x amount of token(s) to user's address
     * @param amount signifies amount of tokens to be minted
     * each token costs 0.5 ether so minting 2 tokens will cost you 1 ether
     */
    function mint(uint256 amount) virtual public payable nonReentrant(){
        require(msg.value == price*amount, "wrong amount");
        cometAddress.mint(msg.sender, amount);
    }

    /**
     * @notice returns the amount of tokens held by each address
     * @param account address of the account
     */
    function balanceOf(address account) virtual public view returns (uint256) {
        return cometAddress.balanceOf(account);
    }

    /**
     * @notice returns the proposal attributes such as creator address, reciever address, no.of votes etc.
     * @param _proposalNumber the proposal Id of the proposal you want to view
     */
    function viewProposal(uint256 _proposalNumber) virtual public view returns (Proposal memory) {
        return proposals[_proposalNumber];
    }
    
    /**
     * @notice sends the proposal, activates it and emits an event to log it.
     * @param _notion describe the reason for which you are collecting votes e.g. "Flood relief"
     * @param _amount enter the amount you want to transfer in wei
     * @param _to enter the address who you want the funds transferred to
     * a user who doe not have any tokens cannot send proposals
     * all proposals have IDs
     * an event is emitted containing some information about the proposal
     */
    function sendProposal (string memory _notion, uint256 _amount, address _to) virtual public nonReentrant() {
        //start timer
        require(msg.sender != address(0) && balanceOf(msg.sender) > 0, "user is ineliglible");
        proposals[proposalNumber] = Proposal(msg.sender, _to, 0, _amount, true);
        emit declareProposal(proposalNumber, _notion, msg.sender, _amount, _to);
        proposalNumber++;
        
    }
    
    /**
     * @notice users can vote yes on a proposal
     * @param _proposalNumber enter the proposal Id of the proposal you want to vote yes on
     * specify the proposal id to vote for it
     * you must have comet tokens to vote
     * you cannote vote again
     * your tokens determine the weight of your vote(3 tokens = 3 votes)
     */
    function vote(uint256 _proposalNumber) virtual public {
        require(proposals[_proposalNumber].isActive==true, "proposal not active anymore");
        require(msg.sender != address(0) && balanceOf(msg.sender) > 0, "user ineliglible to vote");
        require(hasVoted[_proposalNumber][msg.sender] == false, "you have already voted");
        hasVoted[_proposalNumber][msg.sender] = true;
        proposals[_proposalNumber].votes += balanceOf(msg.sender);
    }

    /**
     * @notice users who change their mind about their vote can un-vote
     * @param _proposalNumber enter the proposal Id of the proposal you want to un-vote on
     * specify the proposal id to un-vote it
     * you must have comet tokens participate
     * you cannote un-vote again
     * your tokens determine the weight of your vote(3 tokens = 3 votes) hence 3 votes will be subtracted
     */
    function veto(uint256 _proposalNumber) virtual public {
        require(proposals[_proposalNumber].isActive==true, "proposal not active anymore");
        require(msg.sender != address(0) && balanceOf(msg.sender) > 0, "user ineliglible to vote");
        require(hasVoted[_proposalNumber][msg.sender] == true, "you have not voted");
        hasVoted[_proposalNumber][msg.sender] = false;
        proposals[_proposalNumber].votes -= balanceOf(msg.sender);
    }

    /**
     * @notice proposal senders can end their proposal
     * @param _proposalNumber enter the proposal Id of the proposal you want to end
     * @dev use totalSupply() as a denominator in % calc as each token stands for one vote
     * specify the proposal id to end it
     * you must have comet tokens participate
     * the proposal must be active/existing for you to end it
     * if votes are > 50% ether will be transferred to the recipient
     * otherwise ether will stay in the contract and the proposal wil end
     */
    function endProposal(uint256 _proposalNumber) virtual public nonReentrant() {
        require(proposals[_proposalNumber].isActive==true, "proposal already ended");
        require(msg.sender != address(0) && proposals[_proposalNumber].creator == msg.sender, "user is ineliglible");
        proposals[_proposalNumber].isActive = false;
        uint poll = (proposals[_proposalNumber].votes * 100) / cometAddress.totalSupply();
        if(poll >= 50) {
            (bool sent, bytes memory data) = proposals[_proposalNumber].reciever.call{value: proposals[_proposalNumber].amount}("");
            require(sent, "Failed to send Ether");
            emit transfer(proposals[_proposalNumber].reciever, data);
        }
    }

    /**
     * @notice proposal senders can end withdraw/cancel thier proposals
     * @param _proposalNumber enter the proposal Id of the proposal you want to end
     * specify the proposal id to end it
     * you must have comet tokens participate
     * the proposal must be active/existing for you to end it
     * this function does not calculate votes
     * this function will end the proposal and the ether will NOT be transfered to the recipient
     */
    function withdrawProposal(uint256 _proposalNumber) virtual public nonReentrant() {
        require(proposals[_proposalNumber].isActive==true, "proposal already ended");
        require(msg.sender != address(0) && proposals[_proposalNumber].creator == msg.sender, "user is ineliglible");
        proposals[_proposalNumber].isActive = false;
    }
}

