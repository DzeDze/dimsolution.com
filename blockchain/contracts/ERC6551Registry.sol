// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../interfaces/IERC6551Registry.sol";
import "../lib/MinimalProxyStore.sol";
import "./ERC6551Account.sol";

contract ERC6551Registry is IERC6551Registry {
    address public immutable implementation;

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function createAccount(address tokenCollection, uint256 tokenId)
        external
        returns (address)
    {
        return _createAccount(block.chainid, tokenCollection, tokenId);
    }

    function account(address tokenCollection, uint256 tokenId)
        external
        view
        returns (address)
    {
        return _account(block.chainid, tokenCollection, tokenId);
    }

    function _createAccount(
        uint256 chainId,
        address tokenCollection,
        uint256 tokenId
    ) internal returns (address) {
        bytes memory encodedTokenData = abi.encode(
            chainId,
            tokenCollection,
            tokenId
        );
        bytes32 salt = keccak256(encodedTokenData);
        address accountProxy = MinimalProxyStore.cloneDeterministic(
            implementation,
            encodedTokenData,
            salt
        );

        emit AccountCreated(accountProxy, tokenCollection, tokenId);

        return accountProxy;
    }

    function _account(
        uint256 chainId,
        address tokenCollection,
        uint256 tokenId
    ) internal view returns (address) {
        bytes memory encodedTokenData = abi.encode(
            chainId,
            tokenCollection,
            tokenId
        );
        bytes32 salt = keccak256(encodedTokenData);

        address accountProxy = MinimalProxyStore.predictDeterministicAddress(
            implementation,
            encodedTokenData,
            salt
        );

        return accountProxy;
    }
}