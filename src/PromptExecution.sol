// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PromptExecution
 * @dev Records the lifecycle of prompt execution on-chain.
 * Stores encrypted prompt/response CIDs for transparency and auditability.
 */
contract PromptExecution is Ownable {
    enum PromptStatus {
        Pending,
        Processing,
        Completed,
        Failed
    }

    struct Prompt {
        string promptId;           // Unique prompt ID
        string modelId;            // Model used for inference
        address user;              // User who submitted the prompt
        address computeNode;       // Node that processed the prompt
        string encryptedPromptCID; // IPFS CID of encrypted prompt
        string responseCID;        // IPFS CID of encrypted response
        PromptStatus status;       // Current status
        uint256 inputTokens;       // Number of input tokens
        uint256 outputTokens;      // Number of output tokens
        uint256 createdAt;         // Submission timestamp
        uint256 completedAt;       // Completion timestamp
    }

    // Prompt ID => Prompt
    mapping(string => Prompt) public prompts;
    // Track existing prompt IDs
    mapping(string => bool) public promptExists;
    // User => list of prompt IDs
    mapping(address => string[]) public userPrompts;
    // Compute node => list of prompt IDs
    mapping(address => string[]) public nodePrompts;

    // Total prompts processed
    uint256 public totalPrompts;
    // Registered compute nodes
    mapping(address => bool) public registeredNodes;
    address[] public nodeList;

    event PromptCreated(
        string indexed promptId,
        string indexed modelId,
        address indexed user,
        string encryptedPromptCID
    );

    event ResponseSubmitted(
        string indexed promptId,
        address indexed computeNode,
        string responseCID,
        uint256 outputTokens
    );

    event PromptFailed(string indexed promptId, string reason);
    event ComputeNodeRegistered(address indexed node);
    event ComputeNodeRemoved(address indexed node);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Register a compute node.
     */
    function registerNode(address _node) external onlyOwner {
        require(!registeredNodes[_node], "Node already registered");
        registeredNodes[_node] = true;
        nodeList.push(_node);
        emit ComputeNodeRegistered(_node);
    }

    /**
     * @dev Remove a compute node.
     */
    function removeNode(address _node) external onlyOwner {
        require(registeredNodes[_node], "Node not registered");
        registeredNodes[_node] = false;
        emit ComputeNodeRemoved(_node);
    }

    /**
     * @dev Create a new prompt execution request.
     * @param _promptId Unique prompt ID
     * @param _modelId Model to use for inference
     * @param _encryptedPromptCID IPFS CID of the encrypted prompt
     * @param _inputTokens Estimated input token count
     */
    function createPrompt(
        string calldata _promptId,
        string calldata _modelId,
        string calldata _encryptedPromptCID,
        uint256 _inputTokens
    ) external {
        require(!promptExists[_promptId], "Prompt ID already exists");
        require(bytes(_encryptedPromptCID).length > 0, "Invalid CID");

        prompts[_promptId] = Prompt({
            promptId: _promptId,
            modelId: _modelId,
            user: msg.sender,
            computeNode: address(0),
            encryptedPromptCID: _encryptedPromptCID,
            responseCID: "",
            status: PromptStatus.Pending,
            inputTokens: _inputTokens,
            outputTokens: 0,
            createdAt: block.timestamp,
            completedAt: 0
        });

        promptExists[_promptId] = true;
        userPrompts[msg.sender].push(_promptId);
        totalPrompts++;

        emit PromptCreated(_promptId, _modelId, msg.sender, _encryptedPromptCID);
    }

    /**
     * @dev Submit inference response. Called by compute node or platform.
     * @param _promptId The prompt being responded to
     * @param _computeNode The node that performed inference
     * @param _responseCID IPFS CID of encrypted response
     * @param _outputTokens Number of output tokens generated
     */
    function submitResponse(
        string calldata _promptId,
        address _computeNode,
        string calldata _responseCID,
        uint256 _outputTokens
    ) external onlyOwner {
        require(promptExists[_promptId], "Prompt does not exist");
        Prompt storage prompt = prompts[_promptId];
        require(prompt.status == PromptStatus.Pending || prompt.status == PromptStatus.Processing, "Invalid status");

        prompt.computeNode = _computeNode;
        prompt.responseCID = _responseCID;
        prompt.outputTokens = _outputTokens;
        prompt.status = PromptStatus.Completed;
        prompt.completedAt = block.timestamp;

        nodePrompts[_computeNode].push(_promptId);

        emit ResponseSubmitted(_promptId, _computeNode, _responseCID, _outputTokens);
    }

    /**
     * @dev Mark a prompt as failed.
     */
    function failPrompt(string calldata _promptId, string calldata _reason) external onlyOwner {
        require(promptExists[_promptId], "Prompt does not exist");
        prompts[_promptId].status = PromptStatus.Failed;
        emit PromptFailed(_promptId, _reason);
    }

    /**
     * @dev Get prompt details.
     */
    function getPrompt(string calldata _promptId) external view returns (Prompt memory) {
        require(promptExists[_promptId], "Prompt does not exist");
        return prompts[_promptId];
    }

    /**
     * @dev Get user's prompt history.
     */
    function getUserPrompts(address _user) external view returns (string[] memory) {
        return userPrompts[_user];
    }

    /**
     * @dev Get list of registered compute nodes.
     */
    function getRegisteredNodes() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < nodeList.length; i++) {
            if (registeredNodes[nodeList[i]]) activeCount++;
        }

        address[] memory activeNodes = new address[](activeCount);
        uint256 j = 0;
        for (uint256 i = 0; i < nodeList.length; i++) {
            if (registeredNodes[nodeList[i]]) {
                activeNodes[j] = nodeList[i];
                j++;
            }
        }
        return activeNodes;
    }

    /**
     * @dev Get total prompts for a node.
     */
    function getNodePromptCount(address _node) external view returns (uint256) {
        return nodePrompts[_node].length;
    }
}
