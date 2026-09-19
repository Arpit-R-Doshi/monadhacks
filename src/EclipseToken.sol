// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EclipseToken
 * @dev ERC-20 token for the ECLIPSE decentralized AI marketplace on Monad.
 * Used as platform credits for pay-per-use, subscriptions, and compute rewards.
 */
contract EclipseToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18; // 10M tokens max

    // Faucet tracking
    mapping(address => uint256) public lastFaucetClaim;
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18; // 100 ECL per claim
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    event FaucetClaimed(address indexed user, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);

    constructor(address initialOwner) ERC20("Eclipse AI", "ECL") Ownable(initialOwner) {
        // Mint initial supply to owner: 1M tokens
        _mint(initialOwner, 1_000_000 * 10**18);
    }

    /**
     * @dev Mint new tokens. Only owner can call this.
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Faucet for testnet. Users can claim 100 ECL every hour.
     */
    function claimFaucet() external {
        require(
            block.timestamp - lastFaucetClaim[msg.sender] >= FAUCET_COOLDOWN,
            "Faucet cooldown not elapsed"
        );
        require(totalSupply() + FAUCET_AMOUNT <= MAX_SUPPLY, "Faucet depleted");

        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Approve and transfer in one call for platform payments.
     * @param from Sender
     * @param to Recipient
     * @param amount Amount to transfer
     */
    function platformTransfer(address from, address to, uint256 amount) external onlyOwner {
        _transfer(from, to, amount);
    }
}
