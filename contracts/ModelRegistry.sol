// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ModelRegistry
 * @dev Registry for AI models stored on IPFS.
 * Stores metadata on-chain, actual model data on IPFS (encrypted).
 */
contract ModelRegistry is Ownable {
    struct Model {
        string modelId;         // UUID
        string name;            // Human-readable name
        string description;     // Model description
        string ipfsCID;         // IPFS Content ID of encrypted model
        string category;        // e.g., "text-generation", "image-classification"
        address owner;          // Wallet address of model owner
        uint256 pricePerUse;    // Price in SYN tokens per inference (wei units)
        uint256 subscriptionPrice; // Monthly subscription price in SYN
        uint256 rateLimit;      // Max requests per minute per user
        bool isEncrypted;       // Whether model is encrypted
        bool isActive;          // Whether model is available
        uint256 createdAt;      // Block timestamp of registration
        uint256 totalUses;      // Total number of inferences run
        uint256 rating;         // Average rating (0-500, representing 0.0-5.0)
        uint256 ratingCount;    // Number of ratings
    }

    // Model ID (string) => index in models array
    mapping(string => uint256) private modelIndex;
    // Track if model ID exists
    mapping(string => bool) public modelExists;
    // Owner => list of model IDs
    mapping(address => string[]) public ownerModels;

    Model[] public models;

    event ModelRegistered(
        string indexed modelId,
        string name,
        address indexed owner,
        string ipfsCID,
        uint256 pricePerUse
    );

    event ModelUpdated(string indexed modelId, string ipfsCID, uint256 pricePerUse);
    event ModelDeactivated(string indexed modelId);
    event ModelRated(string indexed modelId, address indexed user, uint256 rating);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Register a new AI model on the platform.
     */
    function registerModel(
        string calldata _modelId,
        string calldata _name,
        string calldata _description,
        string calldata _ipfsCID,
        string calldata _category,
        uint256 _pricePerUse,
        uint256 _subscriptionPrice,
        uint256 _rateLimit
    ) external {
        require(!modelExists[_modelId], "Model ID already exists");
        require(bytes(_modelId).length > 0, "Invalid model ID");
        require(bytes(_ipfsCID).length > 0, "Invalid IPFS CID");

        Model memory newModel = Model({
            modelId: _modelId,
            name: _name,
            description: _description,
            ipfsCID: _ipfsCID,
            category: _category,
            owner: msg.sender,
            pricePerUse: _pricePerUse,
            subscriptionPrice: _subscriptionPrice,
            rateLimit: _rateLimit,
            isEncrypted: true,
            isActive: true,
            createdAt: block.timestamp,
            totalUses: 0,
            rating: 0,
            ratingCount: 0
        });

        modelIndex[_modelId] = models.length;
        models.push(newModel);
        modelExists[_modelId] = true;
        ownerModels[msg.sender].push(_modelId);

        emit ModelRegistered(_modelId, _name, msg.sender, _ipfsCID, _pricePerUse);
    }

    /**
     * @dev Get model by ID.
     */
    function getModel(string calldata _modelId) external view returns (Model memory) {
        require(modelExists[_modelId], "Model does not exist");
        return models[modelIndex[_modelId]];
    }

    /**
     * @dev Get all active models.
     */
    function getAllModels() external view returns (Model[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < models.length; i++) {
            if (models[i].isActive) activeCount++;
        }

        Model[] memory activeModels = new Model[](activeCount);
        uint256 j = 0;
        for (uint256 i = 0; i < models.length; i++) {
            if (models[i].isActive) {
                activeModels[j] = models[i];
                j++;
            }
        }
        return activeModels;
    }

    /**
     * @dev Update model metadata. Only owner can update.
     */
    function updateModel(
        string calldata _modelId,
        string calldata _ipfsCID,
        uint256 _pricePerUse,
        uint256 _subscriptionPrice
    ) external {
        require(modelExists[_modelId], "Model does not exist");
        Model storage model = models[modelIndex[_modelId]];
        require(model.owner == msg.sender, "Not the model owner");

        if (bytes(_ipfsCID).length > 0) model.ipfsCID = _ipfsCID;
        model.pricePerUse = _pricePerUse;
        model.subscriptionPrice = _subscriptionPrice;

        emit ModelUpdated(_modelId, _ipfsCID, _pricePerUse);
    }

    /**
     * @dev Set rate limit for a model. Only owner can set.
     */
    function setRateLimit(string calldata _modelId, uint256 _rateLimit) external {
        require(modelExists[_modelId], "Model does not exist");
        Model storage model = models[modelIndex[_modelId]];
        require(model.owner == msg.sender, "Not the model owner");
        model.rateLimit = _rateLimit;
    }

    /**
     * @dev Increment total uses counter. Called by platform.
     */
    function incrementUses(string calldata _modelId) external onlyOwner {
        require(modelExists[_modelId], "Model does not exist");
        models[modelIndex[_modelId]].totalUses++;
    }

    /**
     * @dev Rate a model (0-500 representing 0.0-5.0).
     */
    function rateModel(string calldata _modelId, uint256 _rating) external {
        require(modelExists[_modelId], "Model does not exist");
        require(_rating <= 500, "Rating must be 0-500");

        Model storage model = models[modelIndex[_modelId]];
        model.rating = ((model.rating * model.ratingCount) + _rating) / (model.ratingCount + 1);
        model.ratingCount++;

        emit ModelRated(_modelId, msg.sender, _rating);
    }

    /**
     * @dev Deactivate a model. Only owner can deactivate.
     */
    function deactivateModel(string calldata _modelId) external {
        require(modelExists[_modelId], "Model does not exist");
        Model storage model = models[modelIndex[_modelId]];
        require(model.owner == msg.sender || owner() == msg.sender, "Not authorized");
        model.isActive = false;
        emit ModelDeactivated(_modelId);
    }

    /**
     * @dev Get models by owner.
     */
    function getModelsByOwner(address _owner) external view returns (string[] memory) {
        return ownerModels[_owner];
    }

    /**
     * @dev Get total number of models.
     */
    function getModelCount() external view returns (uint256) {
        return models.length;
    }

    // ─── CO-OWNERSHIP & TRANSFER ────────────────────────────────

    struct CoOwner {
        address wallet;
        uint256 sharePercent; // 0-100
    }

    // Model ID => array of co-owners
    mapping(string => CoOwner[]) private modelCoOwners;
    // Model ID => wallet => is co-owner (fast lookup)
    mapping(string => mapping(address => bool)) public isCoOwner;

    event CoOwnerAdded(string indexed modelId, address indexed wallet, uint256 sharePercent);
    event CoOwnerRemoved(string indexed modelId, address indexed wallet);
    event ModelOwnershipTransferred(string indexed modelId, address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Add co-owners with percentage-based revenue sharing.
     * Only callable by the primary model owner.
     * Total share across all co-owners must not exceed 100%.
     */
    function addCoOwners(
        string calldata _modelId,
        address[] calldata _wallets,
        uint256[] calldata _shares
    ) external {
        require(modelExists[_modelId], "Model does not exist");
        Model storage model = models[modelIndex[_modelId]];
        require(model.owner == msg.sender, "Not the model owner");
        require(_wallets.length == _shares.length, "Arrays length mismatch");
        require(_wallets.length > 0, "Empty co-owner list");

        // Calculate existing total share
        uint256 totalShare = 0;
        CoOwner[] storage existing = modelCoOwners[_modelId];
        for (uint256 i = 0; i < existing.length; i++) {
            totalShare += existing[i].sharePercent;
        }

        // Add new co-owners
        for (uint256 i = 0; i < _wallets.length; i++) {
            require(_wallets[i] != address(0), "Invalid address");
            require(_shares[i] > 0 && _shares[i] <= 100, "Share must be 1-100");
            require(!isCoOwner[_modelId][_wallets[i]], "Already a co-owner");
            require(_wallets[i] != model.owner, "Owner cannot be a co-owner");

            totalShare += _shares[i];
            require(totalShare <= 100, "Total shares exceed 100%");

            modelCoOwners[_modelId].push(CoOwner({
                wallet: _wallets[i],
                sharePercent: _shares[i]
            }));
            isCoOwner[_modelId][_wallets[i]] = true;

            emit CoOwnerAdded(_modelId, _wallets[i], _shares[i]);
        }
    }

    /**
     * @dev Remove a co-owner. Only callable by the primary model owner.
     */
    function removeCoOwner(string calldata _modelId, address _wallet) external {
        require(modelExists[_modelId], "Model does not exist");
        Model storage model = models[modelIndex[_modelId]];
        require(model.owner == msg.sender, "Not the model owner");
        require(isCoOwner[_modelId][_wallet], "Not a co-owner");

        CoOwner[] storage coOwners = modelCoOwners[_modelId];
        for (uint256 i = 0; i < coOwners.length; i++) {
            if (coOwners[i].wallet == _wallet) {
                coOwners[i] = coOwners[coOwners.length - 1];
                coOwners.pop();
                break;
            }
        }
        isCoOwner[_modelId][_wallet] = false;

        emit CoOwnerRemoved(_modelId, _wallet);
    }

    /**
     * @dev Transfer full primary ownership of a model.
     * Clears the model from the old owner's list and adds to the new owner's list.
     */
    function transferModelOwnership(string calldata _modelId, address _newOwner) external {
        require(modelExists[_modelId], "Model does not exist");
        require(_newOwner != address(0), "Invalid new owner");
        Model storage model = models[modelIndex[_modelId]];
        require(model.owner == msg.sender, "Not the model owner");
        require(_newOwner != msg.sender, "Already the owner");

        address previousOwner = model.owner;
        model.owner = _newOwner;

        // Remove from old owner's list
        string[] storage oldList = ownerModels[previousOwner];
        for (uint256 i = 0; i < oldList.length; i++) {
            if (keccak256(bytes(oldList[i])) == keccak256(bytes(_modelId))) {
                oldList[i] = oldList[oldList.length - 1];
                oldList.pop();
                break;
            }
        }

        // Add to new owner's list
        ownerModels[_newOwner].push(_modelId);

        // Remove new owner from co-owners if they were one
        if (isCoOwner[_modelId][_newOwner]) {
            CoOwner[] storage coOwners = modelCoOwners[_modelId];
            for (uint256 i = 0; i < coOwners.length; i++) {
                if (coOwners[i].wallet == _newOwner) {
                    coOwners[i] = coOwners[coOwners.length - 1];
                    coOwners.pop();
                    break;
                }
            }
            isCoOwner[_modelId][_newOwner] = false;
        }

        emit ModelOwnershipTransferred(_modelId, previousOwner, _newOwner);
    }

    /**
     * @dev Get all co-owners for a model.
     */
    function getCoOwners(string calldata _modelId) external view returns (CoOwner[] memory) {
        require(modelExists[_modelId], "Model does not exist");
        return modelCoOwners[_modelId];
    }
}
