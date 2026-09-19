// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PaymentManager
 * @dev Handles pay-per-use and subscription payments using native Monad testnet tokens (MON).
 * Revenue split: 85% model owner, 10% compute node, 5% platform.
 */
contract PaymentManager is Ownable {
    // Revenue split percentages (basis points, 10000 = 100%)
    uint256 public constant MODEL_OWNER_SHARE = 8500;  // 85%
    uint256 public constant COMPUTE_NODE_SHARE = 1000;  // 10%
    uint256 public constant PLATFORM_SHARE = 500;       // 5%

    struct Subscription {
        string modelId;
        uint256 tokenQuota;      // Total tokens allocated
        uint256 tokensUsed;      // Tokens consumed so far
        uint256 expiresAt;       // Subscription expiry timestamp
        bool isActive;
    }

    struct PaymentRecord {
        address user;
        string modelId;
        uint256 amount;
        uint256 timestamp;
        string paymentType; // "per-use" or "subscription"
    }

    // User => Model ID => Subscription
    mapping(address => mapping(string => Subscription)) public subscriptions;
    // Payment history
    PaymentRecord[] public payments;
    // Platform treasury address
    address public treasury;
    // Accumulated rewards for compute nodes
    mapping(address => uint256) public nodeRewards;
    // Total platform revenue
    uint256 public totalRevenue;

    event PaymentProcessed(
        address indexed user,
        string indexed modelId,
        uint256 amount,
        string paymentType
    );
    event SubscriptionCreated(
        address indexed user,
        string indexed modelId,
        uint256 quota,
        uint256 expiresAt
    );
    event NodeRewarded(address indexed node, uint256 amount);
    event RewardsClaimed(address indexed node, uint256 amount);

    constructor(address _treasury, address initialOwner) Ownable(initialOwner) {
        treasury = _treasury;
    }

    /**
     * @dev Process a pay-per-use payment for model inference using native MON.
     * @param _modelId The model being used
     * @param _modelOwner The model owner receiving 85%
     * @param _computeNode The compute node that ran inference (10%)
     */
    function payPerUse(
        string calldata _modelId,
        address _modelOwner,
        address _computeNode
    ) external payable {
        require(msg.value > 0, "Amount must be > 0");

        // Calculate splits
        uint256 ownerAmount = (msg.value * MODEL_OWNER_SHARE) / 10000;
        uint256 nodeAmount = (msg.value * COMPUTE_NODE_SHARE) / 10000;
        uint256 platformAmount = msg.value - ownerAmount - nodeAmount;

        // Send 85% to model owner in native MON
        (bool sentOwner, ) = payable(_modelOwner).call{value: ownerAmount}("");
        require(sentOwner, "Failed to send MON to model owner");

        // Track node rewards
        nodeRewards[_computeNode] += nodeAmount;
        totalRevenue += platformAmount;

        payments.push(PaymentRecord({
            user: msg.sender,
            modelId: _modelId,
            amount: msg.value,
            timestamp: block.timestamp,
            paymentType: "per-use"
        }));

        emit PaymentProcessed(msg.sender, _modelId, msg.value, "per-use");
        emit NodeRewarded(_computeNode, nodeAmount);
    }

    /**
     * @dev Subscribe to a model with a monthly token quota using native MON.
     * @param _modelId The model to subscribe to
     * @param _modelOwner The model owner address receiving 85%
     * @param _quota Token quota for the subscription period
     * @param _duration Duration in seconds (e.g., 30 days = 2592000)
     */
    function subscribe(
        string calldata _modelId,
        address _modelOwner,
        uint256 _quota,
        uint256 _duration
    ) external payable {
        require(msg.value > 0, "Price must be > 0");

        uint256 ownerAmount = (msg.value * MODEL_OWNER_SHARE) / 10000;
        uint256 platformAmount = msg.value - ownerAmount;

        (bool sentOwner, ) = payable(_modelOwner).call{value: ownerAmount}("");
        require(sentOwner, "Failed to send MON to model owner");

        totalRevenue += platformAmount;

        subscriptions[msg.sender][_modelId] = Subscription({
            modelId: _modelId,
            tokenQuota: _quota,
            tokensUsed: 0,
            expiresAt: block.timestamp + _duration,
            isActive: true
        });

        payments.push(PaymentRecord({
            user: msg.sender,
            modelId: _modelId,
            amount: msg.value,
            timestamp: block.timestamp,
            paymentType: "subscription"
        }));

        emit SubscriptionCreated(msg.sender, _modelId, _quota, block.timestamp + _duration);
        emit PaymentProcessed(msg.sender, _modelId, msg.value, "subscription");
    }

    /**
     * @dev Deduct tokens from subscription quota.
     */
    function deductFromSubscription(
        address _user,
        string calldata _modelId,
        uint256 _tokensUsed
    ) external onlyOwner returns (bool) {
        Subscription storage sub = subscriptions[_user][_modelId];
        if (!sub.isActive || block.timestamp > sub.expiresAt) {
            return false;
        }
        if (sub.tokensUsed + _tokensUsed > sub.tokenQuota) {
            return false;
        }
        sub.tokensUsed += _tokensUsed;
        return true;
    }

    /**
     * @dev Compute node claims accumulated rewards in native MON.
     */
    function claimRewards() external {
        uint256 reward = nodeRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        nodeRewards[msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: reward}("");
        require(sent, "Reward transfer failed");

        emit RewardsClaimed(msg.sender, reward);
    }

    /**
     * @dev Withdraw platform revenue to treasury in native MON. Only owner.
     */
    function withdrawPlatformRevenue() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No revenue to withdraw");

        (bool sent, ) = payable(treasury).call{value: balance}("");
        require(sent, "Withdrawal failed");
    }

    /**
     * @dev Check if user has active subscription for a model.
     */
    function hasActiveSubscription(address _user, string calldata _modelId) external view returns (bool) {
        Subscription memory sub = subscriptions[_user][_modelId];
        return sub.isActive && block.timestamp <= sub.expiresAt && sub.tokensUsed < sub.tokenQuota;
    }

    /**
     * @dev Get subscription details.
     */
    function getSubscription(address _user, string calldata _modelId)
        external view returns (Subscription memory)
    {
        return subscriptions[_user][_modelId];
    }

    /**
     * @dev Get total number of payments.
     */
    function getPaymentCount() external view returns (uint256) {
        return payments.length;
    }

    /**
     * @dev Update treasury address.
     */
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    receive() external payable {}
}
