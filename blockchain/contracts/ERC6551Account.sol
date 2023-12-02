// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

import "./MinimalReceiver.sol";
import "../interfaces/IERC6551Account.sol";
import "../lib/MinimalProxyStore.sol";

contract ERC6551Account is IERC165, IERC1271, IERC6551Account, MinimalReceiver {

    error NotAuthorized();

    uint256 private _nonce;
    mapping(address => address) public executor;

    event ExecutorUpdated(address owner, address executor);

    function executeCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external payable  returns (bytes memory result) {
        address _owner = owner();
        if (msg.sender != _owner) revert NotAuthorized();

        return _call(to, value, data);
    }

    function executeTrustedCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external payable  returns (bytes memory result) {
        address _executor = executor[owner()];
        if (msg.sender != _executor) revert NotAuthorized();

        return _call(to, value, data);
    }

    function setExecutor(address _executionModule) external  {
        address _owner = owner();
        if (_owner != msg.sender) revert NotAuthorized();

        executor[_owner] = _executionModule;

        emit ExecutorUpdated(_owner, _executionModule);
    }

    function isValidSignature(bytes32 hash, bytes memory signature)
        external
        view
        returns (bytes4 magicValue)
    {
        
        // If account has an executor, check if executor signature is valid
        address _owner = owner();
        address _executor = executor[_owner];

        if (
            _executor != address(0) &&
            SignatureChecker.isValidSignatureNow(_executor, hash, signature)
        ) {
            return IERC1271.isValidSignature.selector;
        }

        // Default - check if signature is valid for account owner
        if (SignatureChecker.isValidSignatureNow(_owner, hash, signature)) {
            return IERC1271.isValidSignature.selector;
        }

        return "";
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(IERC165, ERC1155Receiver)
        returns (bool)
    {
        // default interface support
        if (
            interfaceId == type(IERC6551Account).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId
        ) {
            return true;
        }

        address _executor = executor[owner()];

        if (_executor == address(0) || _executor.code.length == 0) {
            return false;
        }

        // if interface is not supported by default, check executor
        try IERC165(_executor).supportsInterface(interfaceId) returns (
            bool _supportsInterface
        ) {
            return _supportsInterface;
        } catch {
            return false;
        }
    }

    function owner() public view returns (address) {
        (uint256 chainId, address tokenCollection, uint256 tokenId) = context();

        if (chainId != block.chainid) {
            return address(0);
        }

        return IERC721(tokenCollection).ownerOf(tokenId);
    }
    
    function nonce() external view returns (uint256) {
        return _nonce;
    }

    function token()
        public
        view
        returns (address tokenCollection, uint256 tokenId)
    {
        (, tokenCollection, tokenId) = context();
    }

    function context()
        internal
        view
        returns (
            uint256,
            address,
            uint256
        )
    {
        bytes memory rawContext = MinimalProxyStore.getContext(address(this));
        if (rawContext.length == 0) return (0, address(0), 0);

        return abi.decode(rawContext, (uint256, address, uint256));
    }

    /**
     * @dev Executes a low-level call
     */
    function _call(
        address to,
        uint256 value,
        bytes calldata data
    ) internal returns (bytes memory result) {
        bool success;
        (success, result) = to.call{value: value}(data);

        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        _nonce++;
    }
}