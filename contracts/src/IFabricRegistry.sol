// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFabricRegistry {
    struct Agent {
        address owner;
        string endpoint;
        string category;
        string name;
        uint256 reputationScore;
        uint256 totalInteractions;
        uint256 registeredAt;
        bool active;
    }

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name, string category, string endpoint);
    event AgentUpdated(uint256 indexed agentId, string endpoint, string category);
    event AgentDeactivated(uint256 indexed agentId);
    event AgentReactivated(uint256 indexed agentId);
    event ReputationUpdated(uint256 indexed agentId, uint256 oldScore, uint256 newScore, uint256 totalInteractions);
    event BatchReputationUpdated(uint256[] agentIds, uint256[] newScores);
}
