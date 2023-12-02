import { useEffect, useState } from 'react';
import { useDataStateContext, useDataDispatchContext } from "../DataProvider";
import { useSDK } from '@metamask/sdk-react';
import LoadingOverlay from 'react-loading-overlay'

import img_card_dummy from "../assets/img/img_card_dummy.jpg"

import Header from "../components/Header";
import onchain_helpers from "../scripts/dim-onchain-helpers";
import offchain_helpers from "../scripts/dim-offchain-helpers";
import common_helpers from "../scripts/common_helpers";
import { ethers } from "ethers";
import env from "../scripts/environment.json";

function Holder() {

    const { MetaMask } = useDataStateContext();
    const dispatch = useDataDispatchContext()
    const [msg, setNotification] = useState("demo");

    const [proofHistory, setProofHistory] = useState([]);
    const [isActive, setIsActive] = useState(false);

    const [certs, setCerts] = useState([]);
    const [attributes, setAttrs] = useState({});
    const [generatedProof, setGenProof] = useState({});
    const [guardian, setGuardian] = useState("");

    const [inputs, setInputs] = useState({ guard_address: '', verifier_address: '' });
    const [checkedState, setCheckedState] = useState({});
    const [showAttributes, setShowAttributes] = useState(false);
    const [showProof, setShowProof] = useState(false);
    const { sdk, chainId, account } = useSDK();

    let ethersProvider = null;

    /*----------------------- CONNECTION ------------------------*/

    const getProvider = () => {
        if (!window.ethereum) {
            console.error("MetaMask provider not found");
            return;
        }

        // Initialize ethers provider
        // if (ethersProvider === null) {
        ethersProvider = new ethers.providers.Web3Provider(window.ethereum);

        return ethersProvider;
    }

    const cmdDisConnect = () => {
        dispatch({ type: "SET_LOGIN", payload: false });
    }

    useEffect(() => {
        console.log('Init...')
        if (attributes.attr && attributes.attr.length > 0) {
            const newCheckedState = attributes.attr.reduce((acc, _, index) => ({
                ...acc,
                [`switchAttribute${index}`]: false
            }), {});

            setCheckedState(newCheckedState);
        }
    }, [attributes]);

    /*----------------------- DATA MANIPULATION ------------------------*/

    const cmdLoadCert = async () => {
        try {
            setIsActive(true);
            const provider = getProvider();
            // load IRC first
            console.log("account = ", account);
            const ircInfo = await onchain_helpers.getIRC(account, provider);
            console.log("ircInfo = ", ircInfo);
            console.log("ircInfoTokenId = ", ircInfo.tokenId.toString());

            if (ircInfo.tokenId) {
                const ircTokenId = ircInfo.tokenId.toString();
                const ircUri = ircInfo.uri;
                const ircMetadataCID = ircInfo.metadata_cid;
                //because we pinned data using pinata, so use pinata gateway to load resource 
                // is faster then ipfs gateway as they connect directly to the node
                const ircMetadataURI = `${env.PINATA_GATEWAY}${ircMetadataCID}`;

                // get TBA for IRC
                const tba = await onchain_helpers.getTBAAddress(ircTokenId, provider);
                console.log("tba = ", tba);
                const certificateList = await onchain_helpers.getTokenList(tba, provider);
                console.log("certificateList = ", certificateList);
                // Create an array to hold all fetch promises
                let fetchPromises = certificateList.map((certificate) => {
                    //because we pinned data using pinata, so use pinata gateway to load resource 
                    // is faster then ipfs gateway as they connect directly to the node
                    const metadataURI = `${env.PINATA_GATEWAY}${certificate.metadata_cid}`;
                    const uri = certificate.uri;

                    // Fetch metadata and certificate data, and combine them in a single promise
                    return Promise.all([
                        common_helpers.fetchIPFSData(metadataURI),
                        common_helpers.fetchIPFSData(uri)
                    ]).then(([metadata, certificateData]) => {
                        return {
                            tokenId: certificate.tokenId.toString(),
                            metadata: metadata,
                            metadataCID: certificate.metadata_cid,
                            certificateData: certificateData
                        };
                    });
                });

                // Add IRC metadata fetch promises to the array
                fetchPromises.push(common_helpers.fetchIPFSData(ircMetadataURI).then(data => ({ ircMetadata: data })));
                fetchPromises.push(common_helpers.fetchIPFSData(ircUri).then(data => ({ ircCertificateData: data })));

                // Wait for all fetch promises to resolve
                const results = await Promise.all(fetchPromises);

                // Process the results
                const certificatesData = results.slice(0, -2); // All except the last two are certificate data
                const ircMetadata = results[results.length - 2].ircMetadata; // second last promise result
                const ircCertificateData = results[results.length - 1].ircCertificateData; // last promise result

                let result = [];
                result.push({
                    tokenId: ircTokenId,
                    metadata: ircMetadata,
                    metadataCID: ircMetadataCID,
                    certificateData: ircCertificateData,
                    tba: tba
                });
                for (const data of certificatesData) {
                    result.push(data);
                }
                // setCerts(certificatesData);
                setCerts(result);
                console.log("DONE!!!");

            } else {
                console.log("You should have one IRC with a TBA generated for it.");
            }
            setIsActive(false);
        } catch (error) {
            setIsActive(false);
            console.error('An error occurred while running the demo:', error);
        }
    }
    const generateAttributes = (cert) => {
        setShowAttributes(true);
        setShowProof(false);
        const metadata = cert.metadata;
        const metadataCID = cert.metadataCID;
        console.log("metadata = ", cert);
        let attributes = [];
        let attributeData = {};
        for (const key in metadata) {
            if (key === "certificateCID") {
                continue; // Skip this iteration if the key is 'certificateCID'
            }
            const attr_value = metadata[key];
            const attr = `${key}: ${attr_value}`;
            attributes.push(attr);
        }
        attributeData = {
            attr: attributes,
            metadataCID: metadataCID
        };
        console.log("attributeData = ", attributeData);
        setAttrs(attributeData);
    }

    const cmdCreateProof = async () => {

        try {
            setIsActive(true);
            const provider = getProvider();
            let selectedAttributes = [];

            for (const key in checkedState) {
                if (checkedState[key]) {
                    const index = parseInt(key.replace('switchAttribute', ''), 10);
                    selectedAttributes.push(attributes.attr[index]);
                }
            }

            console.log(selectedAttributes);
            const verifier_address = inputs['verifier_address'];
            if (selectedAttributes.length == 0 || verifier_address.trim().length === 0) {
                alert("You need to select at least one atribute to generate proof for it. The verifier address also need to be input.");
                return;
            }
            const selectedCert = getSelectedCert();
            console.log("selectedCert = ", selectedCert);

            const proofs = await offchain_helpers.generateProof(selectedCert.metadata, selectedCert.metadataCID, selectedAttributes);
            const certificate_uid = selectedCert.certificateData.certificate_uid;
            const issuer_signature = selectedCert.certificateData.issuer_signature;
            const presentingProof = {
                certificate_uid,
                issuer_signature,
                proofs
            }

            const currentTimestamp = common_helpers.getTimestampInSeconds();
            presentingProof.timestamp = currentTimestamp;
            console.log("presentingProof = ", presentingProof);

            // 2. create proof nft
            // 2.1 upload presenting proof
            // const mintedProof = offchain_helpers.createVerifiableProof(presentingProof, holder_new_address, verifier_seller_address).then((res) => {
            //     console.log("res = ", res);
            // });
            const mintedProof = await offchain_helpers.createVerifiableProof(presentingProof, account, verifier_address, provider);
            console.log("mintedProof = ", mintedProof);
            const tokenId = mintedProof.tokenId.toString();
            const verifer = mintedProof.verifier;
            const mProofs = presentingProof.proofs;

            setGenProof({
                tokenId: tokenId,
                verifer: verifer,
                proofs: mProofs
            });

            setShowAttributes(false);
            setShowProof(true);
            setIsActive(false);
        }
        catch (error) {
            setIsActive(false);
            console.error('An error occurred while running the demo:', error);
        }
    }
    const resetData = () => {
        setInputs({ guard_address: '', verifier_address: '' });
    }
    const cmdCreateNewProof = () => {
        setShowAttributes(true);
        setShowProof(false);
        resetData();
    }

    const cmdLoadProofHistory = async () => {
        try {
            setIsActive(true);
            const provider = getProvider();
            // get the list of proofs of the msg.sender
            const presentingProofs = await onchain_helpers.getProofList(account, provider);

            const promises = presentingProofs.map(presentingProof => {
                const uri = presentingProof.uri;
                const tokenId = presentingProof.tokenId.toString();
                const verifier = presentingProof.verifier;
                return common_helpers.fetchIPFSData(uri).then(data => ({
                    certificate_uid: data.certificate_uid,
                    issuer_signature: data.issuer_signature, tokenId: tokenId,
                    verifier: verifier,
                    proofs: data.proofs, timestamp: data.timestamp
                }));
            });

            const results = await Promise.all(promises);
            // console.log("results = ", results);

            setProofHistory(results);
            setIsActive(false);
        } catch (error) {
            setIsActive(false);
            console.error("Error in runGetProofHistory: ", error);
            // throw error; // or handle error as needed
        }
    }

    const cmdDeleteProof = async (tokenId) => {

        try {
            setIsActive(true);
            const provider = getProvider();
            const signer = provider.getSigner();
            const deletedTokenId = await onchain_helpers.deleteProof(tokenId, signer);
            console.log("deletedTokenId", deletedTokenId.tokenId.toString());
            let data = proofHistory.filter(history => history.tokenId !== tokenId);
            setProofHistory(data);
            setIsActive(false);
        }
        catch (error) {
            setIsActive(false);
            console.error('An error occurred while running the demo:', error);
        }
    }

    const cmdAssign = async () => {
        let guard_address = inputs['guard_address'];
        if (certs.length == 0) {
            alert("You need to select at least one IRC to assign Guardian for it.");
            return;
        }

        if (guard_address.trim().length === 0) {
            alert("The guardian address need to be input.");
            return;
        }

        try {
            setIsActive(true);
            const provider = getProvider();
            const ircInfo = certs[0];
            const tokenId = ircInfo.tokenId;
            const result = await onchain_helpers.assignGuard(tokenId, guard_address, provider.getSigner());
            console.log("result = ", result);
            const guardian = result.guard;
            setGuardian(guardian);
            setIsActive(false);
        }
        catch (error) {
            setIsActive(false);
            console.error('An error occurred while running the demo:', error);
            setNotification(error.toString());
        }
    }

    const cmdRevoke = async (tokenId, certificate_uid) => {
        try {
            setIsActive(true);
            const provider = getProvider();
            console.log(`${tokenId}${certificate_uid}`);
            const result = await onchain_helpers.revokeCredential(tokenId, certificate_uid, provider.getSigner());
            console.log("result = ", result);
            if (result.err == null) {
                const tokenId = result.tokenId.toString();
                let newCerts = [];
                for (const cert of certs) {
                    if (cert.tokenId == result.tokenId) continue;
                    newCerts.push(cert);
                }
                setCerts(newCerts);
            }
            else {
                setNotification(result.err);
            }
        }
        catch (error) {
            setIsActive(false);
            console.log(error);
        }

    }

    /*----------------------- VIEWS HANDLING ------------------------*/

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        if (type === "checkbox") {
            // Handle checkbox
            setCheckedState(prevState => ({ ...prevState, [name]: checked }));
        } else {
            // Handle other input types
            // console.log(`${name}${value}`);
            setInputs(values => ({ ...values, [name]: value }));
            // console.log("inputs = ", inputs);
        }
    };

    const selectCert = (cert) => {

        let data = [];

        for (var i = 0; i < certs.length; i++) {

            if (certs[i].tokenId === cert.tokenId) {
                certs[i].selected = true;
            } else {
                certs[i].selected = false;
            }

            data.push(certs[i]);
        }
        setCerts(data);
        generateAttributes(cert);
    }

    const getSelectedCert = () => {

        for (var i = 0; i < certs.length; i++) {
            if (certs[i].selected) return certs[i];
        }

        return null;
    }

    const showCerts = () => {
        // console.log(certs);
        // console.log(certs[0].tokenId);
        // console.log((certs[0].certificateData.certificate_uid));
        if (certs.slice(1).length == 0) return <></>;
        // ignore the first one of certs as it is an IRC
        let list = certs.slice(1).map((cert) =>
            <div key={cert.tokenId} onClick={() => selectCert(cert)} className="col-md-6 col-lg-5 col-xl-4 mb-5">
                <div className={cert.selected ? "card-certificate selected" : "card-certificate"} selectable="true">
                    <div className="card-img">
                        <img src={img_card_dummy} alt="Certificates" />
                    </div>
                    <div className="card-body">
                        <div className="title">
                            <div>
                                <strong>{cert.metadata.certificateTitle}</strong>
                                <p>TokenId: # {cert.tokenId}</p>
                            </div>
                            <button className="btn btn-primary" onClick={() => cmdRevoke(cert.tokenId, cert.certificateData.certificate_uid)}>Revoke</button>
                        </div>
                    </div>
                </div>
            </div>
        );

        return (
            <section className="block" id="holderCreateProof">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <h2 className="title">Certificates</h2>
                            <p>Select one of your certificate to create Proof</p>
                        </div>
                    </div>
                    <div className="row">
                        {list}
                    </div>
                </div>
            </section>
        )
    }

    const showIRC = () => {

        if (certs.length == 0) return <></>;
        const irc = certs[0];
        let ircView = () =>
            <div onClick={() => selectCert(irc)} className="col-md-6 offset-lg-1 col-lg-6 offset-xl-3 col-xl-5 d-flex align-items-end flex-column">
                <h2 className="title text-end">Identity Representative<br />Certificate (IRC)</h2>
                <div className={irc.selected ? "card-certificate has-bg selected" : "card-certificate has-bg"} selectable="true">
                    <div className="card-img">
                        <img src={img_card_dummy} alt="Certificates" />
                    </div>
                    <div className="card-body">
                        <div className="title">
                            <div>
                                <strong>{irc.metadata.certificateTitle}</strong>
                                <p>TokenId: # {irc.tokenId}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-end">
                    <p><strong>Token Bound Account</strong></p>
                    <p className="color-blue">{irc.tba}</p>
                </div>
            </div>;

        return ircView();
    }

    const showAttributesView = () => {

        if (!showAttributes || !attributes.attr || attributes.attr.length === 0) return <></>;

        let attributeList = attributes.attr.map((attribute, index) => (
            <div className="form-check form-switch" key={index}>
                <input
                    className="form-check-input"
                    onChange={handleChange}
                    type="checkbox"
                    id={`switchAttribute${index}`}
                    name={`switchAttribute${index}`}
                    checked={checkedState[`switchAttribute${index}`] || false}
                />
                <label className="form-check-label" htmlFor={`switchAttribute${index}`}>{attribute}</label>
            </div>
        ));

        return (
            <>
                <div className='row'>
                    <div className="col-12">
                        <h2 className="title">Attributes</h2>
                        <div className="attributes-form">
                            {attributeList}
                        </div>
                    </div>
                </div>

                <div className="row action">
                    <div className="col-lg-6">
                        <div className="form-group">
                            <button className="btn btn-primary" onClick={cmdCreateProof}>Create Proof</button>
                            <input name="verifier_address" onChange={e => handleChange(e)} type="text" className="form-control" placeholder="verifier address" />
                        </div>
                    </div>
                </div>
            </>
        );
    };

    const showProofHistory = () => {
        let historyList = [];
        for (const history of proofHistory) {
            const tokenId = history.tokenId;
            const verifier = history.verifier;
            const timestamp = history.timestamp;
            const dateString = common_helpers.convertTimestampToDateString(timestamp);
            const proofs = history.proofs;
            let attributes = [];
            for (const proof of proofs) {
                const attr = proof.attribute;
                attributes.push(
                    <p>{attr}</p>
                );
            }
            historyList.push(<div key={tokenId} className="card-proof">
                <div className="card-body">
                    <p><strong>tokenId: {tokenId}</strong></p>
                    <p><strong>To Verifier: {verifier}</strong></p>
                    <p><strong>Shared attributes:</strong></p>
                    {attributes}
                    <p><strong>Shared on: </strong>{dateString}</p>
                    <div className="action">
                        <button onClick={() => cmdDeleteProof(tokenId)} className="btn btn-primary">Delete</button>
                    </div>
                </div>
            </div>);
        }

        return (
            <section className="block" id="holderProofHistory">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <h2 className="title">Proof History</h2>

                            <div>
                                <button onClick={cmdLoadProofHistory} className="btn btn-primary">Load History</button>
                            </div>

                            <div className="proof-history-list">
                                {historyList}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        )
    }

    const showGeneratedProof = () => {
        if (common_helpers.isObjectEmpty(generatedProof)) return <></>
        const tokenId = generatedProof.tokenId;
        const verifier = generatedProof.verifer;
        const proofs = generatedProof.proofs;
        console.log("generatedProof = ", generatedProof);
        console.log("proofs = ", proofs);
        let proofJSX = [];
        for (const proof of proofs) {
            const attr = proof.attribute;
            proofJSX.push(<span><strong>attribute: {attr}</strong>,<br />proof:[</span>);
            const proofOfAttr = proof.proof;
            for (let i = 0; i < proofOfAttr.length; i++) {
                // Check if the current element is the last one in the array
                if (i === proofOfAttr.length - 1) {
                    // Append without a comma
                    proofJSX.push(<span>{proofOfAttr[i]}<br /></span>);
                } else {
                    // Append with a comma
                    proofJSX.push(<span>{proofOfAttr[i]},<br /></span>);
                }
            }
            proofJSX.push(<span>]<br /></span>);

        }
        return (
            <div className="col-12">
                <h2 className="title">Proof</h2>
                <p>Show your proof id (tokenId) to the Verifier:</p>
                <pre>
                    <strong>tokenId = {tokenId}</strong><br />
                    <strong>to Verifier = {verifier}</strong><br /><br />
                    {proofJSX}
                </pre>
                <div className="action">
                    <button onClick={cmdCreateNewProof} className="btn btn-primary">Create other proof</button>
                </div>
            </div>);
    }

    const showGuard = () => {
        if (guardian.length == 0) return <></>;
        return (
            <div className="col-lg-6 text-end">
                <h4>Guardian</h4>
                <p className="color-blue">{guardian}</p>
            </div>
        );
    }

    return (
        <LoadingOverlay
            active={isActive}
            spinner
            text='Please wait...'
        >
            <div className="page">
                <Header title='HOLDER PAGE' />

                <div className="main">
                    <section className="block" id="holderBannerHero">
                        <div className="container">
                            <div className="row mb-4">
                                <div className="col-12">
                                    <button className="btn btn-small" onClick={cmdDisConnect}>Disconnect Wallet</button>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 col-lg-5 col-xl-4">
                                    <h2 className="title">Welcome</h2>
                                    <p className="color-gray">{MetaMask.account}</p>
                                    <p>
                                        <button className="btn btn-primary" onClick={cmdLoadCert}>Load Certificates</button>
                                    </p>
                                </div>
                                {showIRC()}
                            </div>
                        </div>
                    </section>

                    {showCerts()}


                    <section className="block" id="holderProof">
                        <div className="container">

                            {showAttributesView()}

                            {showProof &&
                                <div className="row">
                                    {showGeneratedProof()}

                                </div>
                            }
                        </div>
                    </section>

                    <section className="block" id="holderAssignGuardian">
                        <div className="container">
                            <div className="row">
                                <div className="col-12">
                                    <h2 className="title">Assign a Guardian for your IRC</h2>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-lg-6">
                                    <div className="form-group">
                                        <input name='guard_address' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Guardian blockchain address" />
                                        <button onClick={cmdAssign} className="btn btn-primary">Assign</button>
                                    </div>
                                </div>
                                {showGuard()}
                            </div>
                        </div>
                    </section>

                    {showProofHistory()}

                    <section className="block" id="pageLog">
                        <div className="container">
                            <div className="row">
                                <div className="col-12">
                                    <pre className="color-blue">
                                        {msg}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </LoadingOverlay>
    );
}

export default Holder;