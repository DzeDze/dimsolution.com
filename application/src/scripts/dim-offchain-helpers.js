const onchain_helpers = require('./dim-onchain-helpers.js');
const {fetchIPFSData} = require('./common_helpers.js');
const {Web3} = require("web3");
const { on } = require('events');
const env = require("./environment.json");
const common_helpers = require("./common_helpers.js");


const sign = async (data, signer) => {
    const message = data;

    try {
        const from = await signer.getAddress();
        if (!from) {
            alert(`Invalid account -- please connect using eth_requestAccounts first`);
            return;
        }

        const signature = await signer.signMessage(data);
        return signature;
    } catch (err) {
        console.error(err);
        return { err: "Error! Please check the console for more detail." };
    }
};


async function issue(metadata_json, isIRC, to, metamaskProvider) {
    try {
        
        // 1.1 update metadata json with a computed tba account if it is for an IRC
        const tokenId = await onchain_helpers.getCounter(metamaskProvider);
        console.log("isIRC = ", isIRC);
        if (isIRC) {
            console.log("tokenId = ", tokenId.toString());
            const preComputedTBA = await onchain_helpers.getPrecomputeTBA(tokenId, metamaskProvider);
            console.log("preComputedTBA = ", preComputedTBA);
            metadata_json.holderUUID = preComputedTBA;
            console.log("holderUUID = ", metadata_json.holderUUID);
        }

        // 2. upload metadata json
        const metadata_cid = await common_helpers.uploadJSON(metadata_json);
        console.log("metadata_cid = ", metadata_cid);
        // 3. generate certificate uid
        const certificate_uid = await generateCertificateUID(metadata_json, metadata_cid);
        console.log("certificate_uid = ", certificate_uid);
        // 3.1 sign certificate_uid
        // const signature  = sign(certificate_uid);
        const signature = await sign(certificate_uid, metamaskProvider.getSigner());
        console.log("signature = ", signature);
        // 3.2 form Credential Data
        // const credential_data = new CredentialData(certificate_uid, signature, issuer_address);
        const credential_data_json = {
            certificate_uid: certificate_uid,
            issuer_signature: signature,
            issuer_blc_address: metadata_json.issuerAddress
        }
        // 4. upload credential data
        const credential_cid = await common_helpers.uploadJSON(credential_data_json);
        console.log("credential_cid", credential_cid);
        // 5.1 form uri
        const uri = `${env.IPFS_GATEWAY}${credential_cid}`;
        console.log("uri = ", uri);
        // 5.2 issue credential
        const issued = await onchain_helpers.issueCredential(to, tokenId, certificate_uid, uri, metadata_cid, isIRC, metamaskProvider.getSigner());
        return issued;
    }
    catch (error) {
        console.log(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

/*------------- HELPERS FOR HOLDERS ------------------*/

async function generateLeafs(metadata_json, metadata_cid) {
    let attributes = [];
    for (const key in metadata_json) {
        let attr_key = key;
        let attr_value = metadata_json[key];

        let attr = `${attr_key}: ${attr_value}`;
        attributes.push(attr);
    }
    attributes.push(`metadata_cid: ${metadata_cid}`);

    const leafs = attributes.map(attribute => window.keccak256(attribute).toString('hex'));

    return leafs;
}

async function generateMerkleTree(metadata_json, metadata_cid) {
    const leafs = await generateLeafs(metadata_json, metadata_cid);
    console.log("leafs = ", leafs);
    const merkle_tree = new window.MerkleTree(leafs, window.keccak256, { sortPairs: true } );
    console.log("merkle_tree = ", merkle_tree);
    return merkle_tree;
}

async function generateCertificateUID(metadata_json, metadata_cid) {

    const merkle_tree = await generateMerkleTree(metadata_json, metadata_cid);
    return merkle_tree.getRoot().toString('hex');
}

async function generateProof(metadata, metadata_cid, attributes) {
    const merkle_tree = await generateMerkleTree(metadata, metadata_cid);
    // generate certificate uid
    let proofs = [];

    attributes.forEach((attribute) => {
        const leafToProof = window.keccak256(attribute);
        const proof = merkle_tree.getHexProof(leafToProof);

        proofs.push({
            attribute: attribute,
            proof: proof
        });
    });

    return proofs;
}

async function createVerifiableProof(presenting_proof, to, verifer, metamaskProvider) {
    
    try {
        // 1. upload presenting proof
        const presenting_proof_cid = await common_helpers.uploadJSON(presenting_proof);
        // 2. make a verifiable proof nft
        // 2.1 form an uri
        const presenting_proof_uri = `${env.IPFS_GATEWAY}${presenting_proof_cid}`;
        const mintedProof = await onchain_helpers.mintVP(to, presenting_proof_uri, verifer, metamaskProvider.getSigner());
        return mintedProof;
    }
    catch (error) {
        console.log(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

/*------------- HELPERS FOR VERIFIERS ------------------*/

async function verifyPresentedProof(tokenId, callerAddress, metamaskProvider) {

    try {
        // 1. get the proof uri
        const uri = await onchain_helpers.vpTokenUriOf(tokenId, callerAddress, metamaskProvider);
        console.log("uri = ", uri);
        if(uri === "Proof deleted."){
            return "Proof deleted.";
        }
            
        console.log("uri = ", uri);
        // 1.1 load the content
        const presentedProof = await fetchIPFSData(uri);
        // console.log("presentedProof = ", presentedProof);
        const certificate_uid = presentedProof.certificate_uid;
        // 1.2 check if certificate_uid belongs to a revoked certificate
        const isRevoked = await onchain_helpers.isRevoked(certificate_uid, metamaskProvider);
        const issuer_signature = presentedProof.issuer_signature;
        const web3 = new Web3();
        const recoverAddress = web3.eth.accounts.recover(certificate_uid, issuer_signature);
        // console.log("recoverAddress = ", recoverAddress);
        const issuer_name = await onchain_helpers.getIssuerName(recoverAddress, metamaskProvider);
        // console.log("issuer_name = ", issuer_name);
        // for demo purpose, if there is an issuer registered in the blockchain match the recovered address that
        // recovered from the given certificate_uid and signature we consider that issuer is valid, 
        // in reality, the address of the isssuer and its corresponding name must be public and everyone could validate
        // that info by compare the recovered address with the public one.
        let validIssuer = (issuer_name.length === 0)?false:true;
        const proofs = presentedProof.proofs;
        let result = {
            tokenId: tokenId,
            certificate_uid: certificate_uid,
            recoverAddress: recoverAddress,
            signature: issuer_signature,
            isRevoked: isRevoked,
            validIssuer: validIssuer,
        };
        let verifyingProofs = [];
        proofs.forEach((proofInfo) => {
            const attr = proofInfo.attribute;
            const proof = proofInfo.proof;
            const leaf = window.keccak256(attr);
            const verify_merkle_tree = new window.MerkleTree(proof, window.keccak256, { sortPairs: true });
            const verified = verify_merkle_tree.verify(proof, leaf, certificate_uid);

            verifyingProofs.push({
                attribute: attr,
                proof: proof,
                verified: verified
            });
        });
        result.proofs = verifyingProofs;
        return result;
    } catch (error) {
        console.error("Error verifying proof:", error);
    }
}

class CredentialData {
    constructor(certificate_uid, issuer_signature, issuer_blc_address) {
        this.certificate_uid = certificate_uid;
        this.issuer_signature = issuer_signature;
        this.issuer_blc_address = issuer_blc_address;
    }
}
module.exports = {
    
    CredentialData,
    issue,
    generateCertificateUID,
    generateProof,
    createVerifiableProof,
    verifyPresentedProof
};