// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../message-bridge/interfaces/IMessageBridge.sol";
import "./MessageApp.sol";

contract TokenVault is MessageApp, Ownable {
    using SafeERC20 for IERC20;
    uint256 private constant GAS_LIMIT = 1000000;

    mapping(bytes32 => bool) public records;

    address public remotePegBridge;

    mapping(address => uint256) public minDeposit;

    event Deposited(
        bytes32 depositId,
        address depositor,
        address token,
        uint256 amount,
        address mintAccount,
        uint64 nonce,
        bytes32 messageId
    );

    event Withdrawn(
        bytes32 withdrawId,
        address receiver,
        address token,
        uint256 amount,
        bytes32 refId,
        address burnAccount
    );

    event MinDepositUpdated(address token, uint256 amount);

    constructor(address _messageBridge) {
        messageBridge = _messageBridge;
    }

    function deposit(address _token, uint256 _amount, address _mintAccount, uint64 _nonce) external returns (bytes32) {
        (bytes32 depositId, bytes32 messageId) = _deposit(_token, _amount, _mintAccount, _nonce);
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        emit Deposited(depositId, msg.sender, _token, _amount, _mintAccount, _nonce, messageId);
        return depositId;
    }

    function _deposit(
        address _token,
        uint256 _amount,
        address _mintAccount,
        uint64 _nonce
    ) private returns (bytes32, bytes32) {
        require(_amount > minDeposit[_token], "amount too small");
        bytes32 depositId = keccak256(
            abi.encodePacked(msg.sender, _token, _amount, _mintAccount, _nonce, uint64(block.chainid), address(this))
        );
        require(records[depositId] == false, "record exists");
        bytes memory message = abi.encode(_token, _amount, _mintAccount, msg.sender, depositId);
        bytes32 messageId = IMessageBridge(messageBridge).sendMessage(remotePegBridge, message, GAS_LIMIT);
        records[depositId] = true;
        return (depositId, messageId);
    }

    function receiveMessage(address _sender, bytes calldata _message) external onlyMessageBridge {
        require(_sender == remotePegBridge, "sender is not remote peg bridge");
        _withdraw(_message);
    }

    function _withdraw(bytes calldata _message) private {
        (address token, uint256 amount, address receiver, address burnAccount, bytes32 burnId) = abi.decode(
            (_message),
            (address, uint256, address, address, bytes32)
        );
        bytes32 withdrawId = keccak256(abi.encodePacked(receiver, token, amount, burnAccount, burnId, address(this)));
        require(records[withdrawId] == false, "record exists");
        records[withdrawId] = true;
        IERC20(token).safeTransfer(receiver, amount);
        emit Withdrawn(withdrawId, receiver, token, amount, burnId, burnAccount);
    }

    function setMinDeposit(address[] calldata _tokens, uint256[] calldata _amounts) external onlyOwner {
        require(_tokens.length == _amounts.length, "length mismatch");
        for (uint256 i = 0; i < _tokens.length; i++) {
            minDeposit[_tokens[i]] = _amounts[i];
            emit MinDepositUpdated(_tokens[i], _amounts[i]);
        }
    }

    function setRemotePegBridge(address _remotePegBridge) external onlyOwner {
        remotePegBridge = _remotePegBridge;
    }
}
