// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SingleEvent {
    event SendNumber(address from, uint256 number);

    function emitNumber(uint256 number) external {
        emit SendNumber(msg.sender, number);
    }
}
