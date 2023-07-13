// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../../verifiers/interfaces/IReceiptVerifier.sol";
import {BytesLib} from "solidity-bytes-utils/contracts/BytesLib.sol";

contract VerifyEmitNumber is Ownable {
    IReceiptVerifier public receiptVerifier;

    event VerifiedNumber(uint64 chainId, uint64 blknum, address from, uint256 number);

    constructor(IReceiptVerifier _receiptVerifier) {
        receiptVerifier = _receiptVerifier;
    }

    mapping(uint64 => address) public srcContract;

    bytes32 private logTopic = keccak256(bytes("SendNumber(address,uint256)"));

    function submitNumberReceiptProof(
        bytes calldata _receipt,
        bytes calldata _proof,
        bytes calldata _auxiBlkVerifyInfo
    ) external {
        IReceiptVerifier.ReceiptInfo memory receiptInfo = receiptVerifier.verifyReceiptAndLog(
            _receipt,
            _proof,
            _auxiBlkVerifyInfo
        );
        // status must be 1
        require(bytes1(receiptInfo.status) == 0x01, "receipt status is fail");
        address sc = srcContract[receiptInfo.chainId];
        bool findLog;
        address from;
        uint256 number;

        // loop to get the target event
        // TODO, for developer, log index can be a arg, avoid useless for loop
        for (uint256 i = 0; i < receiptInfo.logs.length; i++) {
            if (receiptInfo.logs[i].addr == sc && receiptInfo.logs[i].topics[0] == logTopic) {
                from = address(bytes20(BytesLib.slice(receiptInfo.logs[i].data, 12, 20)));
                number = uint256(bytes32(BytesLib.slice(receiptInfo.logs[i].data, 32, 32)));
                findLog = true;
                break;
            }
        }
        require(findLog == true, "fail to find the event log");
        emit VerifiedNumber(receiptInfo.chainId, receiptInfo.blkNum, from, number);
    }

    function setReceiptVerifier(IReceiptVerifier _receiptVerifier) external onlyOwner {
        receiptVerifier = _receiptVerifier;
    }

    function setSrcContract(uint64 _chainId, address _contract) external onlyOwner {
        srcContract[_chainId] = _contract;
    }
}
