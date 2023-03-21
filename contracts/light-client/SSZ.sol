// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./Types.sol";

library SSZ {
    function isValidMerkleBranch(
        bytes32 leaf,
        bytes32[] memory branch,
        uint256 index,
        bytes32 root
    ) internal pure returns (bool) {
        bytes32 restoredMerkleRoot = restoreMerkleRoot(leaf, branch, index);
        return root == restoredMerkleRoot;
    }

    function restoreMerkleRoot(bytes32 leaf, bytes32[] memory branch, uint256 index) internal pure returns (bytes32) {
        bytes32 value = leaf;
        for (uint256 i = 0; i < branch.length; i++) {
            if ((index / (2 ** i)) % 2 == 1) {
                value = sha256(bytes.concat(branch[i], value));
            } else {
                value = sha256(bytes.concat(value, branch[i]));
            }
        }
        return value;
    }

    function hashTreeRoot(BeaconBlockHeader memory header) internal pure returns (bytes32) {
        bytes32 left = sha256(
            bytes.concat(
                sha256(bytes.concat(toLittleEndian(header.slot), toLittleEndian(header.proposerIndex))),
                sha256(bytes.concat(header.parentRoot, header.stateRoot))
            )
        );
        bytes32 right = sha256(
            bytes.concat(
                sha256(bytes.concat(header.bodyRoot, bytes32(0))),
                sha256(bytes.concat(bytes32(0), bytes32(0)))
            )
        );
        return sha256(bytes.concat(left, right));
    }

    function toLittleEndian(uint256 x) internal pure returns (bytes32) {
        bytes32 res;
        for (uint256 i = 0; i < 32; i++) {
            res = (res << 8) | bytes32(x & 0xff);
            x >>= 8;
        }
        return res;
    }
}
