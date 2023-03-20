// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

interface ITendermintLightClient {
    function isHeaderSynced(uint64 height) external view returns (bool);

    function getAppHash(uint64 height) external view returns (bytes32);
}
