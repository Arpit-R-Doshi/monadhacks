// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PaymentManager
 * @dev Handles pay-per-use and subscription payments for the SYN3RGY marketplace.
 * Revenue split: 85% model owner, 10% compute node, 5% platform.
 */
contract PaymentManager is Ownable {
    IERC20 public synToken;

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

    constructor(address _synToken, address _treasury, address initialOwner) Ownable(initialOwner) {
        synToken = IERC20(_synToken);
        treasury = _treasury;
    }

    /**
     * @dev Process a pay-per-use payment for model inference.
     * @param _modelId The model being used
     * @param _user The user paying
     * @param _modelOwner The model owner receiving payment
     * @param _computeNode The compute node that ran inference
     * @param _amount Total payment amount in SYN tokens
     */
    function payPerUse(
        string calldata _modelId,
        address _user,
        address _modelOwner,
        address _computeNode,
        uint256 _amount
    ) external onlyOwner {
        require(_amount > 0, "Amount must be > 0");
        require(synToken.balanceOf(_user) >= _amount, "Insufficient balance");

        // Calculate splits
        uint256 ownerAmount = (_amount * MODEL_OWNER_SHARE) / 10000;
        uint256 nodeAmount = (_amount * COMPUTE_NODE_SHARE) / 10000;
        uint256 platformAmount = _amount - ownerAmount - nodeAmount;

        // Transfer from user
        require(synToken.transferFrom(_user, _modelOwner, ownerAmount), "Owner transfer failed");
        require(synToken.transferFrom(_user, address(this), nodeAmount + platformAmount), "Platform transfer failed");

        // Track node rewards
        nodeRewards[_computeNode] += nodeAmount;

        totalRevenue += platformAmount;

        payments.push(PaymentRecord({
            user: _user,
            modelId: _modelId,
            amount: _amount,
            timestamp: block.timestamp,
            paymentType: "per-use"
        }));

        emit PaymentProcessed(_user, _modelId, _amount, "per-use");
        emit NodeRewarded(_computeNode, nodeAmount);
    }

    /**
     * @dev Subscribe to a model with a monthly token quota.
     * @param _modelId The model to subscribe to
     * @param _quota Token quota for the subscription period
     * @param _price Price for the subscription in SYN tokens
     * @param _duration Duration in seconds (e.g., 30 days = 2592000)
     */
    function subscribe(
        string calldata _modelId,
        address _modelOwner,
        uint256 _quota,
        uint256 _price,
        uint256 _duration
    ) external {
        require(_price > 0, "Price must be > 0");
        require(synToken.balanceOf(msg.sender) >= _price, "Insufficient balance");

        // Transfer subscription payment
        uint256 ownerAmount = (_price * MODEL_OWNER_SHARE) / 10000;
        uint256 platformAmount = _price - ownerAmount;

        require(synToken.transferFrom(msg.sender, _modelOwner, ownerAmount), "Owner transfer failed");
        require(synToken.transferFrom(msg.sender, address(this), platformAmount), "Platform transfer failed");

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
            amount: _price,
            timestamp: block.timestamp,
            paymentType: "subscription"
        }));

        emit SubscriptionCreated(msg.sender, _modelId, _quota, block.timestamp + _duration);
        emit PaymentProcessed(msg.sender, _modelId, _price, "subscription");
    }

    /**
     * @dev Deduct tokens from subscription quota.
     * @param _user User address
     * @param _modelId Model ID
     * @param _tokensUsed Tokens consumed in this request
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
     * @dev Compute node claims accumulated rewards.
     */
    function claimRewards() external {
        uint256 reward = nodeRewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        nodeRewards[msg.sender] = 0;
        require(synToken.transfer(msg.sender, reward), "Reward transfer failed");
        emit RewardsClaimed(msg.sender, reward);
    }

    /**
     * @dev Withdraw platform revenue to treasury. Only owner.
     */
    function withdrawPlatformRevenue() external onlyOwner {
        uint256 balance = synToken.balanceOf(address(this));
        uint256 pendingRewards = 0;
        // This is a simplified version - in production, track pending rewards separately
        require(balance > pendingRewards, "No revenue to withdraw");
        uint256 withdrawable = balance - pendingRewards;
        require(synToken.transfer(treasury, withdrawable), "Withdrawal failed");
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
}
