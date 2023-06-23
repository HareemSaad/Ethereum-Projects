import { proving } from "@iden3/js-jwz";
const getCurveFromName = require("ffjavascript").getCurveFromName;
import { base64url as base64 } from "rfc4648";
import {
  BjjProvider,
  CredentialStorage,
  CredentialWallet,
  defaultEthConnectionConfig,
  EthStateStorage,
  ICredentialWallet,
  IDataStorage,
  Identity,
  IdentityCreationOptions,
  IdentityStorage,
  IdentityWallet,
  IIdentityWallet,
  InMemoryDataSource,
  InMemoryMerkleTreeStorage,
  InMemoryPrivateKeyStore,
  KMS,
  KmsKeyType,
  Profile,
  W3CCredential,
  CredentialRequest,
  EthConnectionConfig,
  CircuitStorage,
  CircuitData,
  FSKeyLoader,
  CircuitId,
  IStateStorage,
  ProofService,
  ZeroKnowledgeProofRequest,
  PackageManager,
  AuthorizationRequestMessage,
  PROTOCOL_CONSTANTS,
  AuthHandler,
  AuthDataPrepareFunc,
  StateVerificationFunc,
  DataPrepareHandlerFunc,
  VerificationHandlerFunc,
  IPackageManager,
  VerificationParams,
  ProvingParams,
  ZKPPacker,
  PlainPacker,
  ICircuitStorage,
  core,
  ZKPRequestWithCredential,
  CredentialStatusType,
  Iden3ProofCreationResult,
} from "@0xpolygonid/js-sdk";
import { ethers } from "ethers";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
const fs = require("fs");
var util = require("util");

const rhsUrl = process.env.RHS_URL as string;
const rpcUrl = process.env.RPC_URL as string;
const contractAddress = process.env.CONTRACT_ADDRESS as string;
const walletKey = process.env.WALLET_KEY as string;
const circuitsFolder = process.env.CIRCUITS_PATH as string;

const Actors = {
	Holder: "holder",
	Verifier: "verifier",
	Issuer: "issuer"
}

type didWallet = {
  identityWallet: IIdentityWallet;
  dataStorage: IDataStorage;
  credentialWallet: CredentialWallet;
  circuitStorage: ICircuitStorage;
  proofService: ProofService;
  did: core.DID;
  Auth_BJJ_credential: W3CCredential;
  KYCAgeCredential: W3CCredential;
  KYCAgeCredentialRequest: CredentialRequest;
  KYCAgeProofResult: Iden3ProofCreationResult;
  KYCAgeTxnId: string;
};

let issuer: didWallet = {
  identityWallet: {} as IIdentityWallet,
  dataStorage: {} as IDataStorage,
  credentialWallet: {} as CredentialWallet,
  circuitStorage: {} as ICircuitStorage,
  proofService: {} as ProofService,
  did: {} as core.DID,
  Auth_BJJ_credential: {} as W3CCredential,
  KYCAgeCredential: {} as W3CCredential,
  KYCAgeCredentialRequest: {} as CredentialRequest,
  KYCAgeProofResult: {} as Iden3ProofCreationResult,
  KYCAgeTxnId: "",
};

let holder: didWallet = {
  identityWallet: {} as IIdentityWallet,
  dataStorage: {} as IDataStorage,
  credentialWallet: {} as CredentialWallet,
  circuitStorage: {} as ICircuitStorage,
  proofService: {} as ProofService,
  did: {} as core.DID,
  Auth_BJJ_credential: {} as W3CCredential,
  KYCAgeCredential: {} as W3CCredential,
  KYCAgeCredentialRequest: {} as CredentialRequest,
  KYCAgeProofResult: {} as Iden3ProofCreationResult,
  KYCAgeTxnId: "",
};

let verifier: didWallet = {
  identityWallet: {} as IIdentityWallet,
  dataStorage: {} as IDataStorage,
  credentialWallet: {} as CredentialWallet,
  circuitStorage: {} as ICircuitStorage,
  proofService: {} as ProofService,
  did: {} as core.DID,
  Auth_BJJ_credential: {} as W3CCredential,
  KYCAgeCredential: {} as W3CCredential,
  KYCAgeCredentialRequest: {} as CredentialRequest,
  KYCAgeProofResult: {} as Iden3ProofCreationResult,
  KYCAgeTxnId: "",
};

/*INITIALIZATION OF STORAGE*/
/**
 * These components store credentials, identities, Merkle tree data, and Ethereum state data, respectively.
 * The Ethereum connection configuration is set with contractAddress and rpcUrl.
 * @returns Initializes an object that contains various data storage components,
 * like CredentialStorage, IdentityStorage, InMemoryMerkleTreeStorage, and EthStateStorage.
 */
function initDataStorage(): IDataStorage {
  let conf: EthConnectionConfig = defaultEthConnectionConfig;
  conf.contractAddress = contractAddress;
  conf.url = rpcUrl;

  // InMemoryDataSource is a simple storage component that stores data in the memory of the application, as opposed to persistent storage like a database or browser storage.
  // not suitable for production build -- use browser or db storage
  var dataStorage = {
    credential: new CredentialStorage(new InMemoryDataSource<W3CCredential>()),
    identity: new IdentityStorage(
      new InMemoryDataSource<Identity>(), //create an idnetity storage
      new InMemoryDataSource<Profile>() //create a profile storage
    ),
    mt: new InMemoryMerkleTreeStorage(40), //create mt storage - define depth - store up to 2^40 (~1 trillion) leaf nodes,

    states: new EthStateStorage(defaultEthConnectionConfig),
  };

  return dataStorage;
}

/**
 * Initializes an IdentityWallet object,
 * which is a component responsible for managing and interacting with identities.
 * It takes the dataStorage object and credentialWallet as parameters.
 * It also sets up a BjjProvider for BabyJubJub keys and registers it with the
 * KMS (Key Management System).
 * @param dataStorage
 * @param credentialWallet
 * @returns IdentityWallet object
 */
async function initIdentityWallet(
  dataStorage: IDataStorage,
  credentialWallet: ICredentialWallet
): Promise<IIdentityWallet> {
  const memoryKeyStore = new InMemoryPrivateKeyStore(); // provides a storage mechanism for private keys in an application's memory
  const bjjProvider = new BjjProvider(KmsKeyType.BabyJubJub, memoryKeyStore); // the memoryKeyStore is used as the storage for the BjjProvider
  const kms = new KMS();
  kms.registerKeyProvider(KmsKeyType.BabyJubJub, bjjProvider); //registered in the KMS:

  return new IdentityWallet(kms, dataStorage, credentialWallet);
}

/**
 * Initializes a CredentialWallet object responsible for
 * managing and interacting with credentials.
 * It takes the dataStorage object as a parameter.
 * @param dataStorage
 * @returns CredentialWallet object
 */
async function initCredentialWallet(
  dataStorage: IDataStorage
): Promise<CredentialWallet> {
  return new CredentialWallet(dataStorage);
}

/**
 * Initializes a CircuitStorage object, which is responsible for storing and managing zk-SNARK circuits.
 * It loads and saves different circuit data like
 * AuthV2, AtomicQuerySigV2, StateTransition, and AtomicQueryMTPV2
 * using the FSKeyLoader to load the required files.
 * @returns
 */
async function initCircuitStorage(): Promise<ICircuitStorage> {
  const circuitStorage = new CircuitStorage(
    new InMemoryDataSource<CircuitData>()
  );

  const loader = new FSKeyLoader(path.join(__dirname, circuitsFolder));

  await circuitStorage.saveCircuitData(CircuitId.AuthV2, {
    circuitId: CircuitId.AuthV2,
    wasm: await loader.load(`${CircuitId.AuthV2.toString()}/circuit.wasm`),
    provingKey: await loader.load(
      `${CircuitId.AuthV2.toString()}/circuit_final.zkey`
    ),
    verificationKey: await loader.load(
      `${CircuitId.AuthV2.toString()}/verification_key.json`
    ),
  });

  await circuitStorage.saveCircuitData(CircuitId.AtomicQuerySigV2, {
    circuitId: CircuitId.AtomicQuerySigV2,
    wasm: await loader.load(
      `${CircuitId.AtomicQuerySigV2.toString()}/circuit.wasm`
    ),
    provingKey: await loader.load(
      `${CircuitId.AtomicQuerySigV2.toString()}/circuit_final.zkey`
    ),
    verificationKey: await loader.load(
      `${CircuitId.AtomicQuerySigV2.toString()}/verification_key.json`
    ),
  });

  await circuitStorage.saveCircuitData(CircuitId.StateTransition, {
    circuitId: CircuitId.StateTransition,
    wasm: await loader.load(
      `${CircuitId.StateTransition.toString()}/circuit.wasm`
    ),
    provingKey: await loader.load(
      `${CircuitId.StateTransition.toString()}/circuit_final.zkey`
    ),
    verificationKey: await loader.load(
      `${CircuitId.StateTransition.toString()}/verification_key.json`
    ),
  });

  await circuitStorage.saveCircuitData(CircuitId.AtomicQueryMTPV2, {
    circuitId: CircuitId.AtomicQueryMTPV2,
    wasm: await loader.load(
      `${CircuitId.AtomicQueryMTPV2.toString()}/circuit.wasm`
    ),
    provingKey: await loader.load(
      `${CircuitId.AtomicQueryMTPV2.toString()}/circuit_final.zkey`
    ),
    verificationKey: await loader.load(
      `${CircuitId.AtomicQueryMTPV2.toString()}/verification_key.json`
    ),
  });
  return circuitStorage;
}

/**
 * Initializes a ProofService object,
 * which is responsible for generating proofs using the given
 * identityWallet, credentialWallet, circuitStorage, and stateStorage.
 */
async function initProofService(
  identityWallet: IIdentityWallet,
  credentialWallet: ICredentialWallet,
  stateStorage: IStateStorage,
  circuitStorage: ICircuitStorage
): Promise<ProofService> {
  return new ProofService(
    identityWallet,
    credentialWallet,
    circuitStorage,
    stateStorage
  );
}

/**
 * This is the main function that initializes all the components and creates a new identity.
 * It calls the initDataStorage, initCredentialWallet, initIdentityWallet, initCircuitStorage,
 * and initProofService functions to set up the system.
 */
async function initializeStorage(user: didWallet) {
  // console.log("=============== initialize storage ===============");

  const dataStorage = initDataStorage();
  // console.log('\ndataStorage :: ', dataStorage, '\n')
  const credentialWallet = await initCredentialWallet(dataStorage);
  // console.log('\ncredentialWallet :: ', credentialWallet, '\n')
  const identityWallet = await initIdentityWallet(
    dataStorage,
    credentialWallet
  );

  const circuitStorage = await initCircuitStorage();

  const proofService = await initProofService(
    identityWallet,
    credentialWallet,
    dataStorage.states,
    circuitStorage
  );

  //updation
  user.identityWallet = identityWallet;
  user.dataStorage = dataStorage;
  user.credentialWallet = credentialWallet;
  user.circuitStorage = circuitStorage;
  user.proofService = proofService;
}

/*IDENTITY CREATION*/
/**
 * It creates a new identity and logs the DID (Decentralized Identifier)
 * and the Auth BJJ credential.
 * @param user wallet instance
 * @param who 
 */
async function IdentityCreation(user: didWallet, who: string) {
  // console.log("=============== key creation ===============");

  const { did: issuerDID, credential: issuerAuthBJJCredential } =
    await user.identityWallet.createIdentity({
      method: core.DidMethod.Iden3,
      blockchain: core.Blockchain.Polygon,
      networkId: core.NetworkId.Mumbai,
      revocationOpts: {
        type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
        baseUrl: rhsUrl,
      }, // url to check revocation status of auth bjj credential
    });

  fs.writeFile(
    `./run/BeforeIssuance/${who}.json`.toString(),
    JSON.stringify(user.identityWallet),
    (err: any) => {
      if (err) console.log(err);
      else {
        
      }
    }
  );

  //updation
  user["did"] = issuerDID;
  user["Auth_BJJ_credential"] = issuerAuthBJJCredential;
  console.log(user["did"].toString());
}

/*ISSUE A CREDENTIAL*/
/**
 * issuer issues a credential to user
 * @param issuer wallet
 * @param user wallet
 * function creates a credential request
 * issues a credentials
 * and saves it to wallet
 */
async function issueCredential(issuer: didWallet, user: didWallet) {
  console.log("=============== issue credential ===============");

  const credentialRequest: CredentialRequest = {
    credentialSchema:
      "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json/KYCAgeCredential-v3.json",
    type: "KYCAgeCredential",
    credentialSubject: {
      id: user["did"].toString(),
      birthday: 19960424,
      documentType: 99,
    },
    expiration: 12345678888,
    revocationOpts: {
      type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
      baseUrl: rhsUrl,
    },
  };

  const credential = await issuer["identityWallet"].issueCredential(
    issuer["did"],
    credentialRequest
  );

  console.log("===============  credential ===============");
  console.log(JSON.stringify(credential));

  await user["dataStorage"].credential.saveCredential(credential);

  user.KYCAgeCredential = credential;
  user.KYCAgeCredentialRequest = credentialRequest;

  fs.writeFile(
    `./run/AfterIssuance/issuer.json`.toString(),
    JSON.stringify(issuer.identityWallet),
    (err: any) => {
      if (err) console.log(err);
      else {
        
      }
    }
  );

  fs.writeFile(
    `./run/AfterIssuance/holder.json`.toString(),
    JSON.stringify(user.identityWallet),
    (err: any) => {
      if (err) console.log(err);
      else {
        
      }
    }
  );
}

/*TRANSIT STATE*/
/**
 * function updates DID state to the blockchain
 * @param issuer issuer wallet
 * @param holder holder wallet
 */
async function transitState(issuer: didWallet, holder: didWallet) {
  console.log("=============== transit state ===============");

  // console.log(PROTOCOL_CONSTANTS);

  console.log(
    "================= generate Iden3SparseMerkleTreeProof ======================="
  );

  // since issuer issues this clain, it adds it to its merkle tree
  const res = await issuer["identityWallet"].addCredentialsToMerkleTree(
    [holder.KYCAgeCredential],
    issuer["did"]
  );

  // console.log(res)
  // console.log(res.credentials[0].credentialSubject)

  console.log("================= push states to rhs ===================");

  // issuer pushes its did state to rhs
  await issuer["identityWallet"].publishStateToRHS(issuer["did"], rhsUrl);

  console.log("================= publish to blockchain ===================");

  // issuer updates state to blockchain
  const ethSigner = new ethers.Wallet(
    walletKey,
    (issuer["dataStorage"].states as EthStateStorage).provider
  );
  // console.log(res.oldTreeState, await getCurrentStateOfCredential(issuer))
  const txId = await issuer.proofService.transitState(
    issuer["did"], // did that will transit state
    res.oldTreeState, // previous tree state
    true, // is a transition state is done from genesis state
    issuer["dataStorage"].states, // storage of identity states (only eth based storage currently)
    ethSigner
  );
  console.log(txId);

  fs.writeFile(
    `./run/AfterTransit/issuer.json`.toString(),
    JSON.stringify(issuer.identityWallet),
    (err: any) => {
      if (err) console.log(err);
      else {
        
      }
    }
  );

  fs.writeFile(
    `./run/AfterTransit/holder.json`.toString(),
    JSON.stringify(holder.identityWallet),
    (err: any) => {
      if (err) console.log(err);
      else {
        
      }
    }
  );
}

/*PROOF GENERATION*/
/**
 * The code generates a zero-knowledge proof for the credentialAtomicSigV2 circuit
 * and verifies the proof using the proof service.
 * @param verifier verifier wallet
 * @param holder holder wallet
 */
async function generateProofsUsingAtomicSigV2(
  verifier: didWallet,
  holder: didWallet
) {
  // console.log("=============== generate proofs ===============");

  console.log(
    "================= generate credentialAtomicSigV2 ==================="
  );

  // request can be generated by anyone, bust must be executed by the holder
  // using signature
  const proofReqSig: ZeroKnowledgeProofRequest = {
    id: 1,
    circuitId: CircuitId.AtomicQuerySigV2,
    optional: false,
    query: {
      allowedIssuers: ["*"],
      type: holder.KYCAgeCredentialRequest.type,
      context:
        "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
      credentialSubject: {
        documentType: {
          $eq: 99,
        },
      },
    },
  };

  // holder finds the credential to verify
  let credsToChooseForZKPReq = await holder.credentialWallet.findByQuery(
    proofReqSig.query
  );

  // console.log(credsToChooseForZKPReq)

  // verifier part

  // anyone can generate a proof or verify it as long as the holder has authorized (given the credential information)
  const { proof, pub_signals } = await holder.proofService.generateProof(
    proofReqSig,
    holder.did,
    credsToChooseForZKPReq[0]
  );

  console.log(
    "================= verify credentialAtomicSigV2 ==================="
  );

  const sigProofOk = await verifier.proofService.verifyProof(
    { proof, pub_signals },
    CircuitId.AtomicQuerySigV2
  );
  console.log("valid: ", sigProofOk);
  // console.log("proofService: ", proof, pub_signals);
}

/*AUTHENTICATION REQUESTS*/

async function initPackageManager(
  circuitData: CircuitData,
  prepareFn: AuthDataPrepareFunc,
  stateVerificationFn: StateVerificationFunc
): Promise<IPackageManager> {
  const authInputsHandler = new DataPrepareHandlerFunc(prepareFn);

  const verificationFn = new VerificationHandlerFunc(stateVerificationFn);
  const mapKey =
    proving.provingMethodGroth16AuthV2Instance.methodAlg.toString();
  const verificationParamMap: Map<string, VerificationParams> = new Map([
    [
      mapKey,
      {
        key: circuitData.verificationKey,
        verificationFn,
      },
    ],
  ]);

  const provingParamMap: Map<string, ProvingParams> = new Map();
  provingParamMap.set(mapKey, {
    dataPreparer: authInputsHandler,
    provingKey: circuitData.provingKey,
    wasm: circuitData.wasm,
  });

  const mgr: IPackageManager = new PackageManager();
  const packer = new ZKPPacker(provingParamMap, verificationParamMap);
  const plainPacker = new PlainPacker();
  mgr.registerPackers([packer, plainPacker]);

  return mgr;
}

/**
 * This function handles an authorization request, 
 * which involves generating a proof request, 
 * creating an authorization request message, 
 * generating a proof on the issuer side, 
 * saving the proof to the holder's credential wallet, 
 * and processing the authorization request on the holder side.
 */
async function handleAuthRequest() {
  console.log("=============== handle auth request ===============");

  console.log("=================  credential auth request ===================");

  //verifier creates a prrof request
  const proofReqSig: ZeroKnowledgeProofRequest = {
    id: 1,
    circuitId: CircuitId.AtomicQuerySigV2,
    optional: false,
    query: {
      allowedIssuers: ["*"],
      type: holder.KYCAgeCredentialRequest.type,
      context:
        "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
      credentialSubject: {
        documentType: {
          $eq: 99,
        },
      },
    },
  };

  // authentication message for user to authenticate verifier's proof request
  // holder's permission
  var authRequest: AuthorizationRequestMessage = {
    id: "fe6354fe-3db2-48c2-a779-e39c2dda8d90",
    thid: "fe6354fe-3db2-48c2-a779-e39c2dda8d90",
    typ: PROTOCOL_CONSTANTS.MediaType.PlainMessage,
    from: issuer.did.toString(),
    type: PROTOCOL_CONSTANTS.PROTOCOL_MESSAGE_TYPE
      .AUTHORIZATION_REQUEST_MESSAGE_TYPE,
    body: {
      callbackUrl: "http://testcallback.com",
      message: "message to sign",
      scope: [proofReqSig],
      reason: "verify age",
    },
  };
  console.log(JSON.stringify(authRequest));

  // only issuer
  const credsWithIden3MTPProof =
    await issuer.identityWallet.generateIden3SparseMerkleTreeProof(
      issuer.did,
      [holder.KYCAgeCredential],
      holder.KYCAgeTxnId
    );

  // only holder
  console.log(credsWithIden3MTPProof);
  holder.credentialWallet.saveAll(credsWithIden3MTPProof);

  var authRawRequest = new TextEncoder().encode(JSON.stringify(authRequest));

  // * on the user side */

  console.log("============== handle auth request ==============");
  const authV2Data = await holder.circuitStorage.loadCircuitData(
    CircuitId.AuthV2
  );
  let pm = await initPackageManager(
    authV2Data,
    verifier.proofService.generateAuthV2Inputs.bind(holder.proofService),
    verifier.proofService.verifyState.bind(holder.proofService)
  );

  const authHandler = new AuthHandler(
    pm,
    holder.proofService,
    holder.credentialWallet
  );
  const authHandlerRequest =
    await authHandler.handleAuthorizationRequestForGenesisDID(
      holder.did,
      authRawRequest
    );
  console.log(JSON.stringify(authHandlerRequest, null, 2));
}

/*CREDENTIAL REVOCATION*/
/**
 * function revokes and removes the credential and publishes to blockchain and rhs
 * @param issuer did wallet
 */
async function revocation(issuer: didWallet) {
  const oldState = await getCurrentState(issuer);
  const result = await issuer.identityWallet.revokeCredential(
    issuer.did,
    holder.KYCAgeCredential
  );
  console.log("Revocation Nonce: ", result);

  console.log("================= push states to rhs ===================");

  // issuer pushes its did state to rhs
  await issuer["identityWallet"].publishStateToRHS(issuer["did"], rhsUrl, [result]);

  console.log("================= publish to blockchain ===================");

  // issuer updates state to blockchain
  const ethSigner = new ethers.Wallet(
    walletKey,
    (issuer["dataStorage"].states as EthStateStorage).provider
  );
  const txId = await issuer.proofService.transitState(
    issuer["did"], // did that will transit state
    oldState, // previous tree state
    false, // is a transition state is done from genesis state
    issuer["dataStorage"].states, // storage of identity states (only eth based storage currently)
    ethSigner
  );
  console.log(txId);

  holder.credentialWallet.remove(holder.KYCAgeCredential.id);

  fs.writeFile(
    `./run/AfterRevocation/issuer.json`.toString(),
    JSON.stringify(issuer.identityWallet),
    (err: any) => {
      if (err) console.log(err);
      else {
        
      }
    }
  );

  fs.writeFile(
    `./run/AfterRevocation/holder.json`.toString(),
    JSON.stringify(holder.identityWallet),
    (err: any) => {
      if (err) console.log(err);
      else {
        
      }
    }
  );
}

/*GENERAL FUNCTIONS*/
async function getCurrentState(issuer: didWallet) {
  const oldIssuerTree = await issuer.identityWallet.getDIDTreeModel(issuer.did);
  let claimsRoot = await oldIssuerTree.claimsTree.root();
  let rootOfRoots = await oldIssuerTree.rootsTree.root();
  let revocationRoot = await oldIssuerTree.revocationTree.root();
  const oldTreeState = {
    state: oldIssuerTree.state,
    claimsRoot,
    revocationRoot,
    rootOfRoots,
  };
  return oldTreeState;
}

async function main() {
  console.log("\n\n=============== holder storage initiation =================");
  await initializeStorage(holder); //call only once
  console.log("\n\n=============== issuer storage initiation =================");
  await initializeStorage(issuer); //call only once
  console.log("\n\n=============== verifier storage initiation ===============");
  await initializeStorage(verifier); //call only once
  console.log("\n\n=================== holder did creation ===================");
  await IdentityCreation(holder, Actors.Holder);
  console.log("\n\n=================== issuer did creation ===================");
  await IdentityCreation(issuer, Actors.Issuer);
  console.log("\n\n================== verifier did creation ==================");
  await IdentityCreation(verifier, Actors.Verifier);
  console.log("\n\n=================== credential issuance ===================");
  await issueCredential(issuer, holder); //called by issuer
  console.log("\n\n============== save credential on blocckhain ==============");
  await transitState(issuer, holder);
  console.log("\n\n==================== proof verification ===================");
  await generateProofsUsingAtomicSigV2(verifier, holder);
  console.log("\n\n=================== Handle Auth Request ===================");
  await handleAuthRequest()
  console.log("\n\n======================== revocation =======================");
  await revocation(issuer);
}
(async function () {
  await main();
})();

/**Dictionary
 * Auth BJJ: "Auth BJJ" likely refers to an authentication credential that uses BabyJubJub,
 *      a cryptographic elliptic curve. BabyJubJub is commonly used in zk-SNARKs
 *      (Zero-Knowledge Succinct Non-Interactive Argument of Knowledge) for privacy-preserving
 *      applications.
 */
