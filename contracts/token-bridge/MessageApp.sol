// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.18;

abstract contract MessageApp {
    modifier onlyMessageBridge() {
        require(msg.sender == messageBridge, "caller is not message bridge");
        _;
    }
    address public messageBridge;

    function setMessageBridge(address _messageBridge) external {
        messageBridge = _messageBridge;
    }
}
