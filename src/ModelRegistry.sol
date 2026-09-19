// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ModelRegistry
 * @dev Registry for AI models stored on IPFS.
 */
contract ModelRegistry is Ownable {
    struct Model {
        string modelId;
        string name;
        string ipfsCID;
        address owner;
        uint256 pricePerUse;
        uint256 rateLimit;
        bool isActive;
        uint256 createdAt;
        uint256 totalUses;
    }

    // Separate storage for extended metadata to avoid stack-too-deep
    struct ModelMeta {
        string description;
        string category;
        uint256 subscriptionPrice;
        uint256 rating;
        uint256 ratingCount;
    }

    mapping(string => uint256) private modelIndex;
    mapping(string => bool) public modelExists;
    mapping(address => string[]) public ownerModels;
    mapping(string => ModelMeta) public modelMeta;

    Model[] public models;

    event ModelRegistered(string modelId, string name, address indexed owner, string ipfsCID, uint256 pricePerUse);
    event ModelUpdated(string modelId, string ipfsCID, uint256 pricePerUse);
    event ModelDeactivated(string modelId);
    event ModelRated(string modelId, address indexed user, uint256 rating);

    constructor(address initialOwner) Ownable(initialOwner) {}

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

        models.push(Model({
            modelId: _modelId,
            name: _name,
            ipfsCID: _ipfsCID,
            owner: msg.sender,
            pricePerUse: _pricePerUse,
            rateLimit: _rateLimit,
            isActive: true,
            createdAt: block.timestamp,
            totalUses: 0
        }));

        modelIndex[_modelId] = models.length - 1;
        modelExists[_modelId] = true;
        ownerModels[msg.sender].push(_modelId);

        modelMeta[_modelId] = ModelMeta({
            description: _description,
            category: _category,
            subscriptionPrice: _subscriptionPrice,
            rating: 0,
            ratingCount: 0
        });

        emit ModelRegistered(_modelId, _name, msg.sender, _ipfsCID, _pricePerUse);
    }

    function getModel(string calldata _modelId) external view returns (Model memory) {
        require(modelExists[_modelId], "Model does not exist");
        return models[modelIndex[_modelId]];
    }

    function getModelMeta(string calldata _modelId) external view returns (ModelMeta memory) {
        require(modelExists[_modelId], "Model does not exist");
        return modelMeta[_modelId];
    }

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
        modelMeta[_modelId].subscriptionPrice = _subscriptionPrice;
        emit ModelUpdated(_modelId, _ipfsCID, _pricePerUse);
    }

    function setRateLimit(string calldata _modelId, uint256 _rateLimit) external {
        require(modelExists[_modelId], "Model does not exist");
        require(models[modelIndex[_modelId]].owner == msg.sender, "Not the model owner");
        models[modelIndex[_modelId]].rateLimit = _rateLimit;
    }

    function incrementUses(string calldata _modelId) external onlyOwner {
        require(modelExists[_modelId], "Model does not exist");
        models[modelIndex[_modelId]].totalUses++;
    }

    function rateModel(string calldata _modelId, uint256 _rating) external {
        require(modelExists[_modelId], "Model does not exist");
        require(_rating <= 500, "Rating must be 0-500");
        ModelMeta storage meta = modelMeta[_modelId];
        meta.rating = ((meta.rating * meta.ratingCount) + _rating) / (meta.ratingCount + 1);
        meta.ratingCount++;
        emit ModelRated(_modelId, msg.sender, _rating);
    }

    function deactivateModel(string calldata _modelId) external {
        require(modelExists[_modelId], "Model does not exist");
        Model storage model = models[modelIndex[_modelId]];
        require(model.owner == msg.sender || owner() == msg.sender, "Not authorized");
        model.isActive = false;
        emit ModelDeactivated(_modelId);
    }

    function getModelsByOwner(address _owner) external view returns (string[] memory) {
        return ownerModels[_owner];
    }

    function getModelCount() external view returns (uint256) {
        return models.length;
    }
}
