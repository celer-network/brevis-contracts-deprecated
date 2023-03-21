// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./Types.sol";

interface IZkVerifier {
    function verifySignatureProof(
        bytes32 signingRoot,
        bytes32 syncCommitteePoseidonRoot,
        uint256 participation,
        uint256 commitment,
        Proof memory p
    ) external view returns (bool);

    function verifySyncCommitteeRootMappingProof(
        bytes32 sszRoot,
        bytes32 poseidonRoot,
        Proof memory p
    ) external view returns (bool);
}
