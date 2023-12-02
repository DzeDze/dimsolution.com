// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../interfaces/IERC5484.sol";
import "../interfaces/IERC6147.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract VerifiableCredential is ERC721, ERC721URIStorage, IERC5484, IERC6147 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenId;
    bool private allowFreelyAssignGuardian;
    uint64 constant twoHundredSixtyYear = 8204807520;

    mapping(uint256 => BurnAuth) private burnAuthMap;
    mapping(uint256 => address) private tokenOwners;
    mapping(uint256 => address) private tokenIssuers;

    // @dev A structure representing a token of guard address and expires
    /// @param guard address of guard role
    /// @param expirs UNIX timestamp, the guard could manage the token before expires
    struct GuardInfo {
        address guard;
        uint64 expires;
    }
    mapping(uint256 => GuardInfo) internal _guardInfo;

    struct CredentialInfo {
        uint256 tokenId;
        string uri;
        bool irc;
        string metadata_cid;
    }

    mapping(address => bytes32) public issuers_list;
    mapping(uint256 => string) private credential_metadata_cid;
    mapping(string => string) private issued_credentials;
    mapping(string => bool) public revoked_credentials;
    mapping(uint256 => bool) private irc_list;

    event IssuerAdded(address indexed issuer, string name);
    event CredentialTransfer(address from, address to, uint256 tokenId);

    constructor(
        bool _allowFreelyAssignGuardian
    ) ERC721("VerifiableCredential", "VC") {
        _tokenId.increment(); // id start at 1
        allowFreelyAssignGuardian = _allowFreelyAssignGuardian;
    }

    function getCurrentTimestamp() public view returns (uint256) {
        return block.timestamp;
    }

    function getAllowFreelyAssignGuardian() public view returns (bool) {
        return allowFreelyAssignGuardian;
    }

    function tokenCounter() public view returns (uint256) {
        return _tokenId.current();
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function stringToBytes32(
        string memory source
    ) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }

    function bytes32ToString(
        bytes32 _bytes32
    ) public pure returns (string memory) {
        uint8 i = 0;
        while (i < 32 && _bytes32[i] != 0) {
            i++;
        }

        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }

        return string(bytesArray);
    }

    //Only used for demo purposes, assuming that any organization participating in the system as an Issuer is valid.
    //Verifying the legality of the organizations is beyond the scope of this PoC.
    function addNewIssuer(address _address, string memory _issuerName) public {
        
        bytes32 name = stringToBytes32(_issuerName);
        issuers_list[_address] = name;
        emit IssuerAdded(_address, _issuerName);
    }

    //Only used for demo purposes, assuming that any organization participating in the system as an Issuer is valid.
    //Verifying the legality of the organizations is beyond the scope of this PoC.
    function getIssuerName(
        address issuerAddress
    ) public view returns (string memory) {
        
        string memory name = bytes32ToString(issuers_list[issuerAddress]);
        return name;
    }

    //get a list of tokenId being guarded by a specific guardian
    function getGuardedList() public view returns (CredentialInfo[] memory) {
        uint256 count = tokenCounter();
        CredentialInfo[] memory list = new CredentialInfo[](count);
        uint256 resultCount = 0;
        for (uint256 i = 1; i < count; i++) {
            if (_guardInfo[i].guard == msg.sender) {
                uint256 tokenId = i;
                string memory uri = tokenURI(tokenId);
                bool isIRC = irc_list[tokenId] ? true : false;
                string memory meta_cid = getCredentialMetadataCID(tokenId);
                list[resultCount] = CredentialInfo(
                    tokenId,
                    uri,
                    isIRC,
                    meta_cid
                );
                resultCount++;
            }
        }

        // Copy the results to a correctly sized array
        CredentialInfo[] memory finalResult = new CredentialInfo[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            finalResult[i] = list[i];
        }

        return finalResult;
    }

    function getTokenList() public view returns (CredentialInfo[] memory) {
        uint256 count = tokenCounter();
        CredentialInfo[] memory list = new CredentialInfo[](count);
        uint256 resultCount = 0;
        for (uint256 i = 1; i < count; i++) {
            if (tokenOwners[i] == msg.sender) {
                uint256 tokenId = i;
                string memory uri = tokenURI(tokenId);
                bool isIRC = irc_list[tokenId] ? true : false;
                string memory meta_cid = getCredentialMetadataCID(tokenId);
                list[resultCount] = CredentialInfo(
                    tokenId,
                    uri,
                    isIRC,
                    meta_cid
                );
                resultCount++;
            }
        }

        // Copy the results to a correctly sized array
        CredentialInfo[] memory finalResult = new CredentialInfo[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            finalResult[i] = list[i];
        }

        return finalResult;
    }

    function getIssuedToken() public view returns (CredentialInfo[] memory) {
        uint256 count = tokenCounter();
        CredentialInfo[] memory list = new CredentialInfo[](count);
        uint256 resultCount = 0;
        for (uint256 i = 1; i < count; i++) {
            if (tokenIssuers[i] == msg.sender) {
                uint256 tokenId = i;
                string memory uri = tokenURI(tokenId);
                bool isIRC = irc_list[tokenId] ? true : false;
                string memory meta_cid = getCredentialMetadataCID(tokenId);
                list[resultCount] = CredentialInfo(
                    tokenId,
                    uri,
                    isIRC,
                    meta_cid
                );
                resultCount++;
            }
        }
        // Copy the results to a correctly sized array
        CredentialInfo[] memory finalResult = new CredentialInfo[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            finalResult[i] = list[i];
        }

        return finalResult;
    }

    function getCredentialMetadataCID(
        uint256 tokenId
    ) public view returns (string memory) {
        require(
            tokenOwners[tokenId] == msg.sender ||
                tokenIssuers[tokenId] == msg.sender ||
                _guardInfo[tokenId].guard == msg.sender,
            "Only owner, issuer, or guardian of the credential could view this information."
        );
        return credential_metadata_cid[tokenId];
    }

    function issue(
        address to,
        uint256 tokenId,
        string memory uri,
        BurnAuth burnAuthentication,
        bool irc
    ) internal {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        // remember the `burnAuth` for this token
        burnAuthMap[tokenId] = burnAuthentication;
        // remember the issuer and owner of the token
        tokenIssuers[tokenId] = msg.sender;
        tokenOwners[tokenId] = to;
        if (irc) irc_list[tokenId] = true;
        _tokenId.increment();
        if (!allowFreelyAssignGuardian && irc) {
            uint64 twoHundredSixtyYearFromNow = uint64(getCurrentTimestamp()) +
                twoHundredSixtyYear;
            changeGuard(tokenId, msg.sender, twoHundredSixtyYearFromNow);
        }
        emit Issued(msg.sender, to, tokenId, burnAuthentication);
    }

    function issueCredential(
        address to,
        uint256 tokenId,
        string memory certificate_uid,
        string memory uri,
        string memory metadata_cid,
        bool irc
    ) external {
        // check that the token id is not already used
        require(
            tokenOwners[tokenId] == address(0),
            "This tokenId is already used."
        );
        // check that the certificate_uid is not already used
        string memory metadata = issued_credentials[certificate_uid];
        require(
            bytes(metadata).length == 0,
            "This certificate uid is already used."
        );
        // string memory uri = string.concat(baseUri, certificate_uid);
        issue(to, tokenId, uri, BurnAuth.Both, irc);
        credential_metadata_cid[tokenId] = metadata_cid;
        issued_credentials[certificate_uid] = metadata_cid;
    }

    function burnAuth(uint256 tokenId) external view returns (BurnAuth) {
        return burnAuthMap[tokenId];
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        (address guard, ) = guardInfo(tokenId);
        // Burn the token
        delete tokenIssuers[tokenId];
        delete tokenOwners[tokenId];
        delete burnAuthMap[tokenId];
        delete credential_metadata_cid[tokenId];
        ERC721._burn(tokenId);
        delete _guardInfo[tokenId];
        if (irc_list[tokenId]) delete irc_list[tokenId];
        emit UpdateGuardLog(tokenId, address(0), guard, 0);
    }

    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    function isRevoked(
        string memory credential_uid
    ) external view returns (bool) {
        return revoked_credentials[credential_uid];
    }

    function revokeCredential(
        uint256 tokenId,
        string memory credential_uid
    ) external {
        address issuer = tokenIssuers[tokenId];
        address owner = tokenOwners[tokenId];
        BurnAuth burnAuthentication = burnAuthMap[tokenId];

        require(
            (burnAuthentication == BurnAuth.Both &&
                (msg.sender == issuer || msg.sender == owner)) ||
                (burnAuthentication == BurnAuth.IssuerOnly &&
                    msg.sender == issuer) ||
                (burnAuthentication == BurnAuth.OwnerOnly &&
                    msg.sender == owner) ||
                isContract(owner),
            "You are not allowed to revoke this credential."
        );

        _burn(tokenId);
        delete issued_credentials[credential_uid];
        revoked_credentials[credential_uid] = true; //mark as revoked.
    }

    function changeGuard(
        uint256 tokenId,
        address newGuard,
        uint64 expires
    ) public virtual {
        require(irc_list[tokenId] == true, "Only IRC can be assigned a guard.");
        require(expires > block.timestamp, "ERC6147: invalid expires");
        _updateGuard(tokenId, newGuard, expires, false);
    }

    /// @notice Remove the guard and expires of the NFT
    ///         Only guard can remove its own guard role and expires
    /// @dev The guard address is set to 0 address
    ///      The expires is set to 0
    ///      Throws if `tokenId` is not valid NFT
    /// @param tokenId The NFT to remove the guard and expires for
    function removeGuard(uint256 tokenId) public virtual {
        _updateGuard(tokenId, address(0), 0, true);
    }

    /// @notice Get the guard address and expires of the NFT
    /// @dev The zero address indicates that there is no guard
    /// @param tokenId The NFT to get the guard address and expires for
    /// @return The guard address and expires for the NFT
    function guardInfo(
        uint256 tokenId
    ) public view virtual returns (address, uint64) {
        if (_guardInfo[tokenId].expires >= block.timestamp) {
            return (_guardInfo[tokenId].guard, _guardInfo[tokenId].expires);
        } else {
            return (address(0), 0);
        }
    }

    /// @notice Update the guard of the NFT
    /// @dev Delete function: set guard to 0 address and set expires to 0;
    ///      and update function: set guard to new address and set expires
    ///      Throws if `tokenId` is not valid NFT
    /// @param tokenId The NFT to update the guard address for
    /// @param newGuard The newGuard address
    /// @param expires UNIX timestamp, the guard could manage the token before expires
    /// @param allowNull Allow 0 address
    function _updateGuard(
        uint256 tokenId,
        address newGuard,
        uint64 expires,
        bool allowNull
    ) internal {
        (address guard, ) = guardInfo(tokenId);
        if (!allowNull) {
            require(
                newGuard != address(0),
                "ERC6147: new guard can not be null"
            );
        }
        if (guard != address(0)) {
            require(
                guard == _msgSender(),
                "ERC6147: only guard can change it self. In case this contract was deployed with 'Freely Assign Guardian' forbidden, the Guard of your IRC is the corresponding Issuer by default and nobody could change that guard unless the Issuer themself."
            );
        } else {
            if (allowFreelyAssignGuardian) {
                require(
                    _isApprovedOrOwner(_msgSender(), tokenId),
                    "ERC6147: caller is not owner nor approved"
                );
            } else {
                //only arrive here at credential creation, in case freely assign guadian is not allowed
                require(
                    newGuard == _msgSender(),
                    "Freely Assign Guardian forbidden for this contract deployment. Only the Issuer can be a Guardian."
                );
            }
        }

        if (guard != address(0) || newGuard != address(0)) {
            _guardInfo[tokenId] = GuardInfo(newGuard, expires);
            emit UpdateGuardLog(tokenId, newGuard, guard, expires);
        }
    }

    /// @notice Check the guard address
    /// @dev The zero address indicates there is no guard
    /// @param tokenId The NFT to check the guard address for
    /// @return The guard address
    function _checkGuard(uint256 tokenId) internal view returns (address) {
        (address guard, ) = guardInfo(tokenId);
        address sender = _msgSender();
        if (guard != address(0)) {
            require(
                guard == sender,
                "ERC6147: sender is not guard of the token"
            );
            return guard;
        } else {
            return address(0);
        }
    }

    /// @dev Before transferring the NFT, need to check the guard address
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) {
        address guard;
        address new_from = from;
        if (from != address(0)) {
            guard = _checkGuard(tokenId);
            new_from = ownerOf(tokenId);
            require(
                guard != address(0),
                "Only Guard can transfer this credential."
            );
        }
        _transfer(new_from, to, tokenId);
        tokenOwners[tokenId] = to;
        emit CredentialTransfer(new_from, to, tokenId);
    }

    /// @dev Before safe transferring the NFT, need to check the guard address
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public virtual override(ERC721, IERC721) {
        address guard;
        address new_from = from;
        if (from != address(0)) {
            guard = _checkGuard(tokenId);
            new_from = ownerOf(tokenId);
            require(
                guard != address(0),
                "Only Guard can transfer this credential."
            );
        }

        _safeTransfer(new_from, to, tokenId, _data);
        tokenOwners[tokenId] = to;
    }

    /// @notice Transfer the NFT and remove its guard and expires
    /// @dev The NFT is transferred to `to` and the guard address is set to 0 address
    ///      Throws if `tokenId` is not valid NFT
    /// @param from The address of the previous owner of the NFT
    /// @param to The address of NFT recipient
    /// @param tokenId The NFT to get transferred for
    function transferAndRemove(
        address from,
        address to,
        uint256 tokenId
    ) public virtual {
        safeTransferFrom(from, to, tokenId);
        removeGuard(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, ERC721URIStorage) returns (bool) {
        return
            interfaceId == type(IERC6147).interfaceId ||
            interfaceId == type(IERC5484).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
