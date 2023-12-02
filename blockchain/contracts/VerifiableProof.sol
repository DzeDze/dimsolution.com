// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VerifiableProof is ERC721, ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenId;
    mapping(uint256 => address) private tokenVerifiers;
    mapping(uint256 => bool) private deletedProofs;
    struct ProofInfo {
        uint256 tokenId;
        address verifier;
        string uri;
    }
    event ProofMinted(address owner, address verifier, uint256 tokenId);
    event DeletedProof(uint256 indexed tokenId);

    constructor() ERC721("VerifiableProof", "VP") {
        _tokenId.increment(); // id start at 1
    }

    function tokenCounter() public view returns (uint256) {
        return _tokenId.current();
    }

    function ownerOf(
        uint256 tokenId
    ) public view override(ERC721, IERC721) returns (address) {
        if (deletedProofs[tokenId] == true) return address(0);
        // Only Owner of Verifier of the corresponding tokenId could get this data
        if (
            (super.ownerOf(tokenId) == msg.sender) ||
            (tokenVerifiers[tokenId] == msg.sender)
        ) return super.ownerOf(tokenId);
        else return address(0);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        if (deletedProofs[tokenId] == true) return "Proof deleted.";
        if (
            (super.ownerOf(tokenId) == msg.sender) ||
            (tokenVerifiers[tokenId] == msg.sender)
        ) return super.tokenURI(tokenId);
        else return "Only the corresponding Verifier or Owner could get this data.";
    }

    function listProof() public view returns (ProofInfo[] memory) {
        uint256 count = tokenCounter();
        ProofInfo[] memory list = new ProofInfo[](count);
        uint256 resultCount = 0;
        for (uint256 i = 1; i < count; i++) {
            if(deletedProofs[i]) continue;
            if (super.ownerOf(i) == msg.sender) {
                string memory uri = tokenURI(i);
                address verifier = tokenVerifiers[i];
                ProofInfo memory info = ProofInfo(i, verifier, uri);
                list[resultCount] = info;
                resultCount++;
            }
        }

        // Copy the results to a correctly sized array
        ProofInfo[] memory finalResult = new ProofInfo[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            finalResult[i] = list[i];
        }

        return finalResult;
    }

    function safeMint(address to, string memory uri, address verifier) public {
        uint256 tokenId = _tokenId.current();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        tokenVerifiers[tokenId] = verifier;
        emit ProofMinted(msg.sender, verifier, tokenId);
        _tokenId.increment();
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        require(
            ownerOf(tokenId) == msg.sender,
            "Only owner could burn this token."
        );
        super._burn(tokenId);
        deletedProofs[tokenId] = true;
        delete tokenVerifiers[tokenId];
        emit DeletedProof(tokenId);
    }

    function deleteProof(uint256 tokenId) public {
        _burn(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
