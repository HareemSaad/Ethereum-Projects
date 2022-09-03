// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 < 0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Comet is ERC20, ERC20Burnable {

    address payable contractAddress;
    uint256 public price = 0.5 ether;

    constructor(address _contractAddress) ERC20("Comet", "CMT") {
        contractAddress = payable(_contractAddress);
    }

    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    function mint(address _to, uint256 amount) public payable{
        require(msg.sender == contractAddress, "only the CharityDAO contract can mint");
        _mint(_to, amount);
    }

    // function burn (uint amount) public {  //remove tokens by sending then to a zero address
    //     _burn(msg.sender, amount);
    // }
}