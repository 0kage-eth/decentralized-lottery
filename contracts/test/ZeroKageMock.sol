//SPDX-License-Identifier:MIT

pragma solidity ^0.8.7;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ZeroKageMock is ERC20 {
    constructor(uint256 tokenSupply) ERC20("ZeroKage", "0KAGE") {
        _mint(msg.sender, tokenSupply); // mint 10 million Zero Kage tokens as per ERC 20 standard
    }
}
