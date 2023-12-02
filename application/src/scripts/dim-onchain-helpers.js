const { ethers } = require('ethers');
// const { getParsedEthersError } = require("@enzoferey/ethers-error-parser");
const { vc, tba, reg, vp } = require("./contracts-config.js");
const {getTimestampInSeconds} = require('./common_helpers.js');
const NFTContractJSON = require('../build/contracts/VerifiableCredential.sol/VerifiableCredential.json');
const TBAContractJSON = require('../build/contracts/ERC6551Account.sol/ERC6551Account.json');
const RegistryContractJSON = require('../build/contracts/ERC6551Registry.sol/ERC6551Registry.json');
const VerifiableProofJSON = require('../build/contracts/VerifiableProof.sol/VerifiableProof.json');
const abi = NFTContractJSON.abi;
const tbaABI = TBAContractJSON.abi;
const registryABI = RegistryContractJSON.abi;
const vpABI = VerifiableProofJSON.abi;
const twoHundredSixtyYear = 8204807520;


async function getCounter(metamaskProvider) {
    const contract = new ethers.Contract(vc, abi, metamaskProvider);
    const counter = await contract.tokenCounter();
    return counter;
}

/*------------- HELPERS FOR ISSUERS ------------------*/

async function getIssuerName(address, metamaskProvider) {

    const contract = new ethers.Contract(vc, abi, metamaskProvider);

    try {
        const issuerName = await contract.getIssuerName(address, { from: address });
        return issuerName;

    } catch (error) {
        
        return { err: "Error! Please check the console for more detail." };
        console.log(error);
    }
}

async function addNewIssuer(_address, _name, signer) {
    
    const contract = new ethers.Contract(vc, abi, signer);

    try {
        // Send the transaction
        const tx = await contract.addNewIssuer(_address, _name);
        console.log('Transaction sent:', tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Assuming the event 'IssuerAdded' is emitted with the transaction receipt
        for (const event of receipt.events) {
            if (event.event === 'IssuerAdded') {
                const [add, issuer_name] = event.args;
                console.log('IssuerAdded:', { add, issuer_name });
                return {
                    address: add,
                    issuer: issuer_name
                };
            }
        }
        // If the event is not found, return an error or null
        return { err: "IssuerAdded event not emitted." };
    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function getPrecomputeTBA(tokenId, metamaskProvider) {

    const contract = new ethers.Contract(reg, registryABI, metamaskProvider);

    try {
        const tokenContractAddress = vc;
        const tba = await contract.account(tokenContractAddress, tokenId);
        return tba;

    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function createTBA(tokenId, signer) {
    
    const registryContract = new ethers.Contract(reg, registryABI, signer);

    try {

        const tokenAddress = vc;
        console.log("vc = ", vc);
        
        const tx = await registryContract.createAccount(tokenAddress, tokenId);
        console.log('Transaction sent:', tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Assuming the event 'AccountCreated' is emitted with the transaction receipt
        for (const event of receipt.events) {
            if (event.event === 'AccountCreated') {
        
                const [_account, tokenContract, tokenId] = event.args;
                console.log('AccountCreated:', { _account, tokenContract, tokenId });
                return {
                    tba : _account,
                    tokenContract : tokenContract,
                    tokenId : tokenId
                };
            }
        }
        // If the event is not found, return an error or null
        return { err: "AccountCreated event not emitted." };
    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function issueCredential(to, tokenId, certificate_uid, uri, metadata_cid, isIRC, signer) {

    const contract = new ethers.Contract(vc, abi, signer);

    try {
        // Send the transaction
        const tx = await contract.issueCredential(to, tokenId, certificate_uid, uri, metadata_cid, isIRC);
        console.log('Transaction sent:', tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        let tba = "";
        // Assuming the event 'Issued' is emitted with the transaction receipt
        for (const event of receipt.events) {
            if (event.event === 'Issued') {
                const [issuer, to, tokenId, burnAuthentication] = event.args;
                console.log('Issued:', { issuer, to, tokenId, burnAuthentication });
                if(isIRC) {
                    const tbaAccountCreated = await createTBA(tokenId, signer);
                    if(!tbaAccountCreated.err) 
                        tba = tbaAccountCreated.tba;
                    else
                        return tbaAccountCreated;
                }
                return {
                    tba : tba,
                    issuer_address: issuer,
                    to_address: to,
                    tokenId_: tokenId.toString(),
                    burnAuthentication_: burnAuthentication
                };
            }
        }
        // If the event is not found, return an error or null
        return { err: "Issued event not emitted." };
    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function revokeCredential(tokenId, certificate_uid, signer) {

    const contract = new ethers.Contract(vc, abi, signer);

    try {
        // Send the transaction
        const tx = await contract.revokeCredential(tokenId, certificate_uid);
        console.log('Transaction sent:', tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Assuming the event 'Issued' is emitted with the transaction receipt
        for (const event of receipt.events) {
            if (event.event === 'UpdateGuardLog') {
                const [tokenId, newGuard, oldGuard, expires] = event.args;
                console.log('UpdateGuardLog:', { tokenId, newGuard, oldGuard, expires });
                return {
                    tokenId: tokenId,
                    newGuard: newGuard,
                    oldGuard: oldGuard,
                    expires: expires
                };
            }
        }
        // If the event is not found, return an error or null
        return { err: "UpdateGuardLog event not emitted." };
    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function getIssuedToken(callerAddress, metamaskProvider) {

    const contract = new ethers.Contract(vc, abi, metamaskProvider);

    try {
        const issuedTokens = await contract.getIssuedToken({ from: callerAddress });
        return issuedTokens;

    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

/*------------- HELPERS FOR HOLDERS ------------------*/

async function getTokenList(callerAddress, metamaskProvider) {
    const contract = new ethers.Contract(vc, abi, metamaskProvider);

    try {
        const tokenList = await contract.getTokenList({ from: callerAddress });
        return tokenList;

    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function getIRC(callerAddress, metamaskProvider) {
    const contract = new ethers.Contract(vc, abi, metamaskProvider);
    try {
        const tokenList = await contract.getTokenList({ from: callerAddress });
        let ircInfo;
        tokenList.forEach((token)=>{
            
            if(token.irc) {
                //each holder should only need one TBA, so we stop here after getting 1st record
                ircInfo = {
                    tokenId: token.tokenId,
                    uri: token.uri,
                    isIRC: token.irc,
                    metadata_cid: token.metadata_cid
                };
                return ircInfo;
            }
        });
        return ircInfo;

    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function getTBAAddress(tokenId, metamaskProvider) {
    const contract = new ethers.Contract(reg, registryABI, metamaskProvider);
    try {
        
        const tokenAddress = vc;
        const chainID = process.env.REACT_APP_GANACHE_CHAINID;
        
        const address = await contract.account(tokenAddress, tokenId);
        return address;

    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function mintVP(to, uri, verifier, signer) {
    
    const contract = new ethers.Contract(vp, vpABI, signer);

    try {
        // Send the transaction
        const tx = await contract.safeMint(to, uri, verifier);
        console.log('Transaction sent:', tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Assuming the event 'ProofMinted' is emitted with the transaction receipt
        for (const event of receipt.events) {
            if (event.event === 'ProofMinted') {
                const [owner, verifier, tokenId] = event.args;
                console.log('ProofMinted:', { owner, verifier, tokenId });
                return {
                    owner: owner,
                    verifier: verifier,
                    tokenId: tokenId,
                };
            }
        }
        // If the event is not found, return an error or null
        return { err: "ProofMinted event not emitted." };
    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function assignGuard(tokenId, guard_address, signer) {

    const contract = new ethers.Contract(vc, abi, signer);

    try {
        // Send the transaction
        const twoHundredSixtyYearFromNow = getTimestampInSeconds() + twoHundredSixtyYear;
        const tx = await contract.changeGuard(tokenId, guard_address, twoHundredSixtyYearFromNow);
        console.log('Transaction sent:', tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Assuming the event 'UpdateGuardLog' is emitted with the transaction receipt
        for (const event of receipt.events) {
            if (event.event === 'UpdateGuardLog') {
                const [tokenId, newGuard, guard, expires] = event.args;
                console.log('UpdateGuardLog:', { tokenId, newGuard, guard, expires });
                return {
                    tokenId: tokenId,
                    newGuard: newGuard,
                    guard: guard,
                    expires: expires
                };
            }
        }
        // If the event is not found, return an error or null
        return { err: "UpdateGuardLog event not emitted." };
    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function getProofList(callerAddress, metamaskProvider) {
    const contract = new ethers.Contract(vp, vpABI, metamaskProvider);
    console.log("callerAddress = ", callerAddress);
    try {
        const proofList = await contract.listProof({ from: callerAddress });
        console.log("proofList = ", proofList);
        return proofList;

    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function deleteProof(tokenId, signer) {
    
    const contract = new ethers.Contract(vp, vpABI, signer);
    
    try {
        // Send the transaction
        const tx = await contract.deleteProof(tokenId);
        console.log('Transaction sent:', tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Assuming the event 'DeletedProof' is emitted with the transaction receipt
        for (const event of receipt.events) {
            if (event.event === 'DeletedProof') {
                const [tokenId] = event.args;
                // console.log('DeletedProof:', { tokenId });
                return {
                    tokenId: tokenId
                };
            }
        }
        // If the event is not found, return an error or null
        return { err: "DeletedProof event not emitted." };
    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}


async function getOwner(callerAddress, metamaskProvider) {
    const contract = new ethers.Contract(tba, tbaABI, metamaskProvider);
    console.log("callerAddress = ", callerAddress);
    try {
        const owner = await contract.owner({ from: callerAddress });
        console.log("owner = ", owner);
        return owner;

    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}
//------------------ HELPERS FOR VERIFIERS ------------------

async function vpTokenUriOf(tokenId, callerAddress, metamaskProvider) {
    
    const contract = new ethers.Contract(vp, vpABI, metamaskProvider);
    console.log("tokenId = ", tokenId, callerAddress);
    try {
        const uri = await contract.tokenURI(tokenId, { from: callerAddress });
        // console.log("uri = ", uri);
        return uri;

    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function isRevoked(credential_uid, metamaskProvider) {

    const contract = new ethers.Contract(vc, abi, metamaskProvider);
    try {
        const revoked = await contract.isRevoked(credential_uid);
        return revoked;

    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

//------------------ HELPERS FOR GUARDIAN ------------------

async function loadGuardedIRC(callerAddress, metamaskProvider) {
    
    const contract = new ethers.Contract(vc, abi, metamaskProvider);
    console.log("contract = ", contract);
    try {
        const guardedList = await contract.getGuardedList({ from: callerAddress });
        return guardedList;

    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

async function transfer(from, to, tokenId, signer) {
    
    const contract = new ethers.Contract(vc, abi, signer);

    try {
        // Send the transaction
        const tx = await contract.transferFrom(from, to, tokenId);
        console.log('Transaction sent:', tx.hash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        
        // Assuming the event 'CredentialTransfer' is emitted with the transaction receipt
        for (const event of receipt.events) {
            if (event.event === 'CredentialTransfer') {
                const [new_from, to, tokenId] = event.args;
                console.log('CredentialTransfer:', { new_from, to, tokenId });
                return {
                    from: new_from,
                    to: to,
                    tokenId: tokenId
                };
            }
        }
        // If the event is not found, return an error or null
        return { err: "CredentialTransfer event not emitted." };
    } catch (error) {
        printError(error);
        return { err: "Error! Please check the console for more detail." };
    }
}

function extractErrorMessageFromContext(errorObject) {
    try {
        // Extract the error string from the context property
        const errorString = errorObject.context;

        // Find the index of the error message key
        const errorMessageKeyIndex = errorString.indexOf('\\"message\\":');

        // If the key is found
        if (errorMessageKeyIndex !== -1) {
            // Slice the string from the key to get the rest of the message
            const startOfMessage = errorString.slice(errorMessageKeyIndex + 12);

            // Find the index of the end of the message value
            const endOfMessageIndex = startOfMessage.indexOf('\\"', 2);

            // Extract the message value
            const errorMessage = startOfMessage.slice(1, endOfMessageIndex);

            return errorMessage;
        }
    } catch (e) {
        // If parsing fails or the properties are not as expected, log the error for debugging
        console.error('Error parsing the error message:', e);
    }

    // Return null if no message was extracted
    return null;
}

function printError(error) {
    // const parsedEthersError = getParsedEthersError(error);
    // console.log(extractErrorMessageFromContext(error));
    console.log(error);
}

module.exports = {
    getIssuerName,
    addNewIssuer,
    getPrecomputeTBA,
    issueCredential,
    getIssuedToken,
    getCounter,
    transfer,
    createTBA,
    getTBAAddress,
    assignGuard,
    getProofList,
    getIRC,
    getTokenList,
    getOwner,
    revokeCredential,
    isRevoked,
    mintVP,
    vpTokenUriOf,
    loadGuardedIRC,
    deleteProof
};