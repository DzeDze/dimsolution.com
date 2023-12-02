import { useState, useEffect } from 'react';
import { isAddress } from 'web3-validator';
import { useSDK } from '@metamask/sdk-react';

import { useDataStateContext, useDataDispatchContext } from "../DataProvider";
import { formatBytes, getFileType, getFileId } from '../Util'
import LoadingOverlay from 'react-loading-overlay';

import Header from "../components/Header";

import img_card_dummy from "../assets/img/img_card_dummy.jpg"
import onchain_helpers from "../scripts/dim-onchain-helpers";
import offchain_helpers from "../scripts/dim-offchain-helpers";
import common_helpers from "../scripts/common_helpers";

import { ethers } from "ethers";
import env from "../scripts/environment.json";

function Issuer() {

    const dispatch = useDataDispatchContext()
    const [msg, setNotification] = useState("demo");
    const [issuerNameText, setIssuerText] = useState("");

    const [inputs, setInputs] = useState({});
    const [files, setFiles] = useState([]);
    const [certs, setCerts] = useState([]);
    const [isActive, setIsActive] = useState(false);

    const { sdk, chainId, account } = useSDK();

    let ethersProvider = null;

    useEffect(() => {

        getIssuerName(account);

    }, []);

    const getProvider = () => {
        if (!window.ethereum) {
            console.error("MetaMask provider not found");
            return;
        }

        // Initialize ethers provider
        if (ethersProvider === null) {
            ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        }
        return ethersProvider;
    }

    const getIssuerName = async (issuer_address) => {

        try {
            setIsActive(true);
            const ethersProvider = getProvider();
            console.log('ethersProvider = ', ethersProvider);
            console.log("issuer_address = ", issuer_address);
            const issuerName = await onchain_helpers.getIssuerName(issuer_address, ethersProvider);

            if (issuerName != '') setIssuerText(issuerName);
            setIsActive(false);
        }
        catch (err) {
            setIsActive(false);
            console.log(err);
        }

    }

    const cmdDisConnect = () => {
        sdk?.terminate();
        dispatch({ type: "SET_LOGIN", payload: false });
    };

    const cmdRegister = async () => {
        // Prompt user for account connections
        // const provider = await provider.send("eth_requestAccounts", []);
        try {
            setIsActive(true);
            const provider = getProvider();
            const signer = provider.getSigner();
            let issuerNameText = document.getElementById('issuerNameText').value;
            setIssuerText(issuerNameText);
            const res = await onchain_helpers.addNewIssuer(account, issuerNameText, signer);
            console.log("res = ", res);
            setIsActive(false);
        }
        catch (error) {
            setIsActive(false);
            console.log(error);
        }

    };
    const cmdIssue = async () => {
        try {
            setIsActive(true);
            // Initialize ethers provider
            const ethersProvider = getProvider();
            await ethersProvider.send("eth_requestAccounts", []); // Request account access

            // Get the signer
            // const signer = ethersProvider.getSigner();
            const certificateCID = await common_helpers.uploadFile(files[0]);
            console.log("certificateCID = ", certificateCID);
            const metadataJson = common_helpers.formatInputsToJSON(inputs);
            metadataJson.certificateCID = certificateCID;
            metadataJson.file = `${env.IPFS_GATEWAY}${certificateCID}`;
            metadataJson.issuerAddress = account;
            console.log("metadataJson = ", metadataJson);
            const isIRC = inputs.isIRCCheck;
            const to = inputs.holderBlcAddr;

            const from = ethersProvider.selectedAddress;

            const result = await offchain_helpers.issue(metadataJson, isIRC, to, ethersProvider);
            console.log("result = ", result);
            setIsActive(false);
        }
        catch (error) {
            setIsActive(false);
            console.log(error);
        }

    };

    const cmdLoadIssuedCertificate = async () => {
        try {
            setIsActive(true);
            const ethersProvider = getProvider();
            const issuedTokens = await onchain_helpers.getIssuedToken(account, ethersProvider);

            let result = [];
            for (const issuedToken of issuedTokens) {
                const tokenId = issuedToken.tokenId.toString();
                const uri = issuedToken.uri;
                const metadata_cid = issuedToken.metadata_cid;
                const metadataURI = `${env.PINATA_GATEWAY}${metadata_cid}`;

                // Fetch metadata and certificate data in parallel
                const [metadata, certificate_data] = await Promise.all([
                    common_helpers.fetchIPFSData(metadataURI),
                    common_helpers.fetchIPFSData(uri)
                ]);

                // Use the fetched data
                result.push({
                    tokenId: tokenId,
                    certificateName: metadata.certificateTitle,
                    certificateUID: certificate_data.certificate_uid
                });
            }

            console.log(result);
            setCerts(result);
            setIsActive(false);

        } catch (error) {
            setIsActive(false);
            console.error('An error occurred:', error);
        }
    };


    const cmdRevoke = async (tokenId, certificate_uid) => {
        try {
            setIsActive(true);
            const provider = getProvider();
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
            setIsActive(false);
        }
        catch (error) {
            setIsActive(false);
            console.log(error);
        }

    }
    const initPlaceRegister = () => {
        if (issuerNameText != "") return (<></>);

        let data = ["Fantasy University", "Awesome Department of Motor Vehicles", "FattyGym"];

        return (
            <div className="col-md-6 offset-lg-1 col-lg-6 offset-xl-3 col-xl-5">
                <h2 className="title">Register yourself as</h2>

                <select id="issuerNameText" className="form-select" aria-label="Register yourself as">
                    {data.map((item) =>
                        <option key={item} value={item}>{item}</option>
                    )}
                </select>

                <button className="btn btn-primary" onClick={cmdRegister}>Register</button>

            </div>
        );
    };

    const handleChange = (event) => {
        const target = event.target;
        const name = target.name;
        // Check if the input is a checkbox
        const value = target.type === 'checkbox' ? target.checked : target.value;

        if (name === "holder_block_add" && !isAddress(value)) {
            alert('error');
            return;
        }

        // Update the state
        setInputs(values => ({ ...values, [name]: value }));
    };

    const onFileChange = event => {

        let file = event.target.files[0];
        let tmpFiles = files.concat(file);

        setFiles(tmpFiles);
    };

    const cmdRemoveFile = (file) => {
        let tmpFiles = files.filter(item => item !== file);
        setFiles(tmpFiles);
    };

    const showFiles = () => {

        if (files.length == 0) return (<></>)

        const fileList = files.map((file) =>
            <li key={getFileId(file.name, file.size)} type={getFileType(file.name)}>
                <span className="file-name">{file.name}</span>
                <span onClick={() => cmdRemoveFile(file)} className="file-action">Delete</span>
                <span className="file-size">{formatBytes(file.size, 2)}</span>
            </li>
        );

        return (
            <div className="list-file">
                <div className="list-title">File added</div>
                <ul>{fileList}</ul>
            </div>
        )
    };

    const showCerts = () => {
        if (certs.length == 0) return (<></>);
        let certList = certs.map((cert) =>

            <div key={cert.tokenId} className="col-md-6 col-lg-5 col-xl-4 mb-5">
                <div className="card-certificate">
                    <div className="card-img">
                        <img src={img_card_dummy} alt="Certificates" />
                    </div>
                    <div className="card-body">
                        <div className="title">
                            <div>
                                <strong>{cert.certificateName}</strong>
                                <p>TokenId: {cert.tokenId}</p>
                            </div>
                            <button className="btn btn-primary" onClick={() => cmdRevoke(cert.tokenId, cert.certificateUID)}>Revoke</button>
                        </div>
                    </div>
                </div>
            </div>

        );
        return (<div className="row">
            {certList}
        </div>)
    }

    return (
        <LoadingOverlay
            active={isActive}
            spinner
            text='Please wait...'
        >
            <div className="page">
                <Header title='ISSUER PAGE' />

                <div className="main">
                    <section className="block" id="issuerBannerHero">
                        <div className="container">
                            <div className="row mb-4">
                                <div className="col-12">
                                    <button className="btn btn-small" onClick={cmdDisConnect}>Disconnect Wallet</button>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 col-lg-5 col-xl-4">
                                    <h2 className="title">Welcome</h2>
                                    <p className="color-gray">{account}</p>
                                    <p className="color-blue">{issuerNameText}</p>
                                </div>

                                {initPlaceRegister()}

                            </div>
                        </div>
                    </section>

                    {issuerNameText != "" &&
                        <section className="block avoid-bg" id="issuerCreateCertificate">
                            <div className="container">
                                <div className="row">
                                    <div className="col-12">
                                        <h2 className="title">Create a new <br />Certificate</h2>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6 col-lg-5 col-xl-4">
                                        <h3 className="icon-certificate">Certificate details</h3>
                                        <input name='issuerName' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Organization name" aria-label="" />
                                        <input name='certificateTitle' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Certificate name" />
                                        <input name='certificateType' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Certificate type (Optional)" />
                                        <input name='certificateDesc' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Certificate Description (Optional)" />
                                        <input name='issueDate' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Issue date (Optional)" />
                                        <input name='expirationDate' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Valid until (Optional)" />
                                        <input name='authorName' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Issuer name (Optional)" />
                                        <input name='certificateOther' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Other info (Optional)" />

                                        <div className="upload-zone">
                                            <div className="form-upload-file">
                                                <label htmlFor="formFile0001">
                                                    <div className="wrapper">
                                                        <p><b>Certificate file</b></p>
                                                        <p>JPG, PNG or PDF, file size no more than 10MB</p>
                                                        <span className="btn">Select file</span>
                                                    </div>
                                                </label>
                                                <input className="d-none" type="file" id="formFile0001" accept=".pdf, image/png, image/jpeg" onChange={onFileChange} />
                                            </div>

                                            {showFiles()}

                                        </div>

                                    </div>

                                    <div className="col-md-6 offset-lg-1 col-lg-5 offset-xl-3 col-xl-4">
                                        <h3 className="icon-issuer">Issue to</h3>
                                        <input name='holderName' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Holder name" />
                                        <input name='holderBirthday' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Holder Birthday (Optional)" />
                                        <input name='holderPhysicalAddress' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Holder Address (Optional)" />
                                        <input name='holderHeight' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Holder Height (Optional)" />
                                        <select name='holderGender' onChange={e => handleChange(e)} className="form-select" aria-label="Holder Gender (Optional)">
                                            <option value="" disabled >Holder Gender (Optional)</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                        <input name='holderBlcAddr' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Holder blockchain address" />
                                        <input name='holderOther' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Other info (Optional)" />
                                        <div className="mb-4 form-check">
                                            <label className="form-check-label" htmlFor="exampleCheck1">Is this an Identity Representative?<br />(A TBA will be created for IRC)</label>
                                            <input name='isIRCCheck' onChange={e => handleChange(e)} type="checkbox" className="form-check-input" id="exampleCheck1" />
                                        </div>
                                        <div>
                                            <button className="btn btn-primary w-100" onClick={cmdIssue}>Issue</button>
                                        </div>

                                    </div>
                                </div>

                            </div>
                        </section>
                    }

                    {issuerNameText != "" &&
                        <section className="block" id="issuerIssuedCertificate">
                            <div className="container">
                                <div className="row">
                                    <div className="col-4">
                                        <h2 className="title">Issued Certificates</h2>
                                    </div>
                                    <div className='col-3'>
                                        <button className="btn btn-primary w-100" onClick={cmdLoadIssuedCertificate}>Load Certificate</button>
                                    </div>
                                </div>

                                {showCerts()}

                            </div>
                        </section>
                    }
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

export default Issuer;