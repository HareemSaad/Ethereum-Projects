// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "hardhat/console.sol";

error LowOnTokens(uint amount, uint balance);
error LowOnEther(uint amount, uint balance);
error ValueExceedsMintCap(uint amount, uint MintCap);

contract TokenBondingCurve_Linear is ERC20, Ownable {
    uint256 private _tax;

    uint256 private immutable _slope;

    // The percentage of loss when selling tokens (using two decimals)
    //the last 2 digits represent decimal value
    //so a loss of 20.5% will be represented as 2050
    uint256 private _loss_fee_percentage = 1000;

    //so user cannot mint more than 100 tokens at once
    uint256 private mintCap = 100;
    uint256 private supplyCap = 1000000000;

    event tokensBought(address indexed buyer, uint amount, uint total_supply, uint newPrice);
    event tokensSold(address indexed seller, uint amount, uint total_supply, uint newPrice);
    event withdrawn(address from, address to, uint amount, uint time);

    /**
     * @dev Constructor to initialize the contract.
     * @param name_ The name of the token.
     * @param symbol_ The symbol of the token.
     * @param slope_ The slope of the bonding curve.
     * this contract works for all linear curves
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint slope_,
        uint _supplyCap
    ) ERC20(name_, symbol_) {
        _slope = slope_;
        supplyCap = _supplyCap;
    }

    // event tester(uint);
    /**
     * @dev Allows a user to buy tokens.
     * @param _amount The number of tokens to buy.
     */
    function buy(uint256 _amount) external payable {
        require(totalSupply() + _amount <= supplyCap, "exceeds supply cap");
        uint price = _calculatePriceForBuy(_amount);
            // emit tester(msg.value);
            // emit tester(price);
        if(msg.value < price) {
            revert LowOnEther(msg.value, address(msg.sender).balance);
        }
        if(_amount > mintCap) {
            revert ValueExceedsMintCap(_amount, mintCap);
        }
        _mint(msg.sender, _amount);
        (bool sent,) = payable(msg.sender).call{value: msg.value - price}("");
        require(sent, "Failed to send Ether");

        emit tokensBought(msg.sender, _amount, totalSupply(), getCurrentPrice());
    }

    /**
     * @dev Allows a user to sell tokens at a 10% loss.
     * @param _amount The number of tokens to sell.
     */
    function sell(uint256 _amount) external {
        if(balanceOf(msg.sender) < _amount) {
            revert LowOnTokens(_amount, balanceOf(msg.sender));
        }
        uint256 _price = _calculatePriceForSell(_amount);
        uint tax = _calculateLoss(_price);
        _burn(msg.sender, _amount);
        // console.log(tax, _price - tax);
        _tax += tax;

        (bool sent,) = payable(msg.sender).call{value: _price - tax}("");
        require(sent, "Failed to send Ether");

        emit tokensSold(msg.sender, _amount, totalSupply(), getCurrentPrice());
    }

    /**
     * @dev Allows the owner to withdraw the tax in ETH.
     */
    function withdraw() external onlyOwner {
        if(_tax <= 0) {
            revert LowOnEther(_tax, _tax);
        }
        uint amount = _tax;
        _tax = 0;
        (bool sent,) = payable(owner()).call{value: amount}("");
        require(sent, "Failed to send Ether");

        emit withdrawn (address(this), msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Returns the current price of the next token based on the bonding curve formula.
     * @return The current price of the next token in wei.
     */
    function getCurrentPrice() public view returns (uint) {
        return _calculatePriceForBuy(1);
    }

    /**
     * @dev Returns the price for buying a specified number of tokens.
     * @param _tokensToBuy The number of tokens to buy.
     * @return The price in wei.
     */
    function calculatePriceForBuy(
        uint256 _tokensToBuy
    ) external view returns (uint256) {
        return _calculatePriceForBuy(_tokensToBuy);
    }

    /**
     * @dev Returns the price for selling a specified number of tokens.
     * @param _tokensToSell The number of tokens to sell.
     * @return The price in wei.
     */
    function calculatePriceForSell(
        uint256 _tokensToSell
    ) external view returns (uint256) {
        return _calculatePriceForSell(_tokensToSell);
    }

    /**
     * @dev Calculates the price for buying tokens based on the bonding curve.
     * @param _tokensToBuy The number of tokens to buy.
     * @return The price in wei for the specified number of tokens.
     */
    function _calculatePriceForBuy(
        uint256 _tokensToBuy
    ) private view returns (uint256) {
        uint ts = totalSupply();
        uint tsa = ts + _tokensToBuy;
        return area_under_the_curve(tsa) - area_under_the_curve(ts);
    }


    /**
     * @dev Calculates the price for selling tokens based on the bonding curve.
     * @param _tokensToSell The number of tokens to sell.
     * @return The price in wei for the specified number of tokens
     */
    function _calculatePriceForSell(
        uint256 _tokensToSell
    ) private view returns (uint256) {
        uint ts = totalSupply();
        uint tsa = ts - _tokensToSell;
        return area_under_the_curve(ts) - area_under_the_curve(tsa);
    }

    /**
     * @dev calculates area under the curve 
     * @param x value of x
     */
    function area_under_the_curve(uint x) internal view returns (uint256) {
        return (_slope * (x ** 2)) / 2 ;
    }

    /**
     * @dev Calculates the loss for selling a certain number of tokens.
     * @param amount The price of the tokens being sold.
     * @return The loss in wei.
     */
    function _calculateLoss(uint256 amount) private view returns (uint256) {
        return (amount * _loss_fee_percentage) / (1E4);
    }

    function viewTax() external view onlyOwner returns (uint256) {
        return _tax;
    }

    /**
    * @dev Sets the loss for selling a certain number of tokens.
    * @param _loss the loss percentage, must be a 4 digit value, last 2 digits represent decimals
    * so a loss of 20.5% will be represented as 2050
    * @return New Loss.
    */
    function setLoss(uint _loss) external onlyOwner returns (uint256) {
        require(_loss_fee_percentage < 5000, "require loss to be >= 1000 & < 5000");
        _loss_fee_percentage = _loss;
        return _loss_fee_percentage;
    }

    /**
     * @dev Sets the minting cap, so user can not mint more than this value in one tx
     * @param _mintCap The new minting cap value must be greater than 10
     * @return New mint cap.
     */
    function setMintCap(uint _mintCap) external onlyOwner returns (uint256) {
        require(mintCap >= 10, "value should be greater than 10");
        mintCap = _mintCap;
        return mintCap;
    }

    /**
     * @dev Sets the supply cap
     * @param _cap The new cap value must be greater than total supply
     * @return New supply cap.
     */
    function setSupplyCap(uint _cap) external onlyOwner returns (uint256) {
        require(_cap >= totalSupply(), "value cannot be less than total supply");
        supplyCap = _cap;
        return supplyCap;
    }
}