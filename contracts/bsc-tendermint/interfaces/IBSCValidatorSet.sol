// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

interface IBSCValidatorSet {
    function isCurrentValidator(address valAddress) external view returns (bool);
}
