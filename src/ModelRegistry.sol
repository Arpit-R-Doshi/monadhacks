// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ModelRegistry
 * @dev Registry for AI models stored on IPFS.
 */
contract ModelRegistry is Ownable {
    struct Model {
        address owner;
        uint256 pricePerUse;
        uint256 rateLimit;
        uint256 totalUses;
        uint256 createdAt;
        bool isActive;
    }

    mapping(bytes32 => Model) public models;
    mapping(bytes32 => string) public modelCIDs;
    mapping(bytes32 => string) public modelNames;
    mapping(address => bytes32[]) public ownerModels;
    bytes32[] public modelIds;

    event ModelRegistered(bytes32 indexed modelId, address indexed owner, uint256 pricePerUse);
    event ModelUpdated(bytes32 indexed modelId, uint256 pricePerUse);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function registerModel(
        bytes32 _modelId,
        string calldata _name,
        string calldata _ipfsCID,
        uint256 _pricePerUse,
        uint256 _rateLimit
    ) external {
        require(models[_modelId].createdAt == 0, "Exists");

        models[_modelId] = Model({
            owner: msg.sender,
            pricePerUse: _pricePerUse,
            rateLimit: _rateLimit,
            totalUses: 0,
            createdAt: block.timestamp,
            isActive: true
        });

        modelCIDs[_modelId] = _ipfsCID;
        modelNames[_modelId] = _name;
        ownerModels[msg.sender].push(_modelId);
        modelIds.push(_modelId);

        emit ModelRegistered(_modelId, msg.sender, _pricePerUse);
    }

    function getModel(bytes32 _modelId) external view returns (Model memory) {
        return models[_modelId];
    }

    function getModelCID(bytes32 _modelId) external view returns (string memory) {
        return modelCIDs[_modelId];
    }

    function getModelName(bytes32 _modelId) external view returns (string memory) {
        return modelNames[_modelId];
    }

    function updatePrice(bytes32 _modelId, uint256 _price) external {
        require(models[_modelId].owner == msg.sender, "Not owner");
        models[_modelId].pricePerUse = _price;
        emit ModelUpdated(_modelId, _price);
    }

    function incrementUses(bytes32 _modelId) external onlyOwner {
        models[_modelId].totalUses++;
    }

    function deactivate(bytes32 _modelId) external {
        require(models[_modelId].owner == msg.sender || owner() == msg.sender, "Not authorized");
        models[_modelId].isActive = false;
    }

    function getModelCount() external view returns (uint256) {
        return modelIds.length;
    }

    function getModelIdAt(uint256 index) external view returns (bytes32) {
        return modelIds[index];
    }
}
