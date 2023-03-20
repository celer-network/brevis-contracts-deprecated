// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IMessageBridge.sol";
import "./libraries/RLPReader.sol";
import "./libraries/MerkleProofTree.sol";
import "../interfaces/IEthereumLightClient.sol";

contract MessageBridge is IMessageBridge, ReentrancyGuard, Ownable {
    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;
    // storage at sender side
    mapping(uint256 => bytes32) public sentMessages;
    uint256 constant SENT_MESSAGES_STORAGE_SLOT = 2;
    uint256 public nonce;
    uint256 public gasLimitPerTransaction;

    // storage at receiver side
    IEthereumLightClient public lightClient;
    mapping(bytes32 => MessageStatus) public receivedMessages;
    address public remoteMessageBridge;
    bytes32 public remoteMessageBridgeHash;
    bool private initialized;

    // struct to avoid "stack too deep"
    struct MessageVars {
        bytes32 messageHash;
        uint256 nonce;
        address sender;
        address receiver;
        uint256 gasLimit;
        bytes data;
    }

    constructor(address _lightClient, uint256 _gasLimitPerTransaction) {
        lightClient = IEthereumLightClient(_lightClient);
        gasLimitPerTransaction = _gasLimitPerTransaction;
    }

    function sendMessage(address receiver, bytes calldata data, uint256 gasLimit) external returns (bytes32) {
        require(gasLimit <= gasLimitPerTransaction, "MessageBridge: exceed gas limit");
        bytes memory message = abi.encode(nonce, msg.sender, receiver, gasLimit, data);
        bytes32 messageHash = keccak256(message);
        sentMessages[nonce] = messageHash;
        emit MessageSent(messageHash, nonce++, message);
        return messageHash;
    }

    function executeMessage(
        bytes calldata message,
        bytes[] calldata accountProof,
        bytes[] calldata storageProof
    ) external nonReentrant returns (bool success) {
        MessageVars memory vars;
        vars.messageHash = keccak256(message);
        require(receivedMessages[vars.messageHash] == MessageStatus.NEW, "MessageBridge: message already executed");

        // verify the storageProof and message
        require(
            _retrieveStorageRoot(accountProof) == keccak256(storageProof[0]),
            "MessageBridge: invalid storage root"
        );

        (vars.nonce, vars.sender, vars.receiver, vars.gasLimit, vars.data) = abi.decode(
            message,
            (uint256, address, address, uint256, bytes)
        );

        bytes32 key = keccak256(abi.encode(keccak256(abi.encode(vars.nonce, SENT_MESSAGES_STORAGE_SLOT))));
        bytes memory proof = MerkleProofTree.read(key, storageProof);

        require(bytes32(proof.toRlpItem().toUint()) == vars.messageHash, "MessageBridge: invalid message hash");

        // execute message
        require((gasleft() * 63) / 64 > vars.gasLimit + 40000, "MessageBridge: insufficient gas");
        bytes memory recieveCall = abi.encodeWithSignature("receiveMessage(address,bytes)", vars.sender, vars.data);
        (success, ) = vars.receiver.call{gas: vars.gasLimit}(recieveCall);
        receivedMessages[vars.messageHash] = success ? MessageStatus.EXECUTED : MessageStatus.FAILED;
        emit MessageExecuted(vars.messageHash, vars.nonce, message, success);
        return success;
    }

    function finalizedExecutionStateRootAndSlot() public view returns (bytes32 root, uint64 slot) {
        return lightClient.finalizedExecutionStateRootAndSlot();
    }

    function _retrieveStorageRoot(bytes[] calldata accountProof) private view returns (bytes32) {
        // verify accountProof and get storageRoot
        (bytes32 executionStateRoot, ) = finalizedExecutionStateRootAndSlot();
        require(executionStateRoot != bytes32(0), "MessageBridge: execution state root not found");
        require(executionStateRoot == keccak256(accountProof[0]), "MessageBridge: invalid account proof root");

        // get storageRoot
        bytes memory accountInfo = MerkleProofTree.read(remoteMessageBridgeHash, accountProof);
        RLPReader.RLPItem[] memory items = accountInfo.toRlpItem().toList();
        require(items.length == 4, "MessageBridge: invalid account decoded from RLP");
        return bytes32(items[2].toUint());
    }

    function setGasLimitPerTransaction(uint256 _gasLimitPerTransaction) external onlyOwner {
        gasLimitPerTransaction = _gasLimitPerTransaction;
    }

    function setLightClient(address _lightClient) external onlyOwner {
        lightClient = IEthereumLightClient(_lightClient);
    }

    function setRemoteMessageBridge(address _remoteMessageBridge) external onlyOwner {
        remoteMessageBridge = _remoteMessageBridge;
        remoteMessageBridgeHash = keccak256(abi.encodePacked(remoteMessageBridge));
    }
}
