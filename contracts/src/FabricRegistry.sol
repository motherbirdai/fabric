// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IFabricRegistry.sol";

/**
 * @title FabricRegistry
 * @notice On-chain agent registry for the Fabric trust layer.
 *
 *         Agents register with a name, category, and endpoint URL.
 *         The Fabric operator posts batched reputation updates from
 *         off-chain trust scoring. Anyone can read agent data and
 *         reputation scores for routing decisions.
 *
 *         Reputation scores are scaled by 1e4:
 *           50000 = 5.0 (max), 0 = unrated
 *
 *         Categories are free-form strings matching the gateway's
 *         routing taxonomy (e.g. "image-generation", "translation").
 */
contract FabricRegistry is IFabricRegistry {
    // ─── State ───

    address public owner;
    address public operator;

    uint256 private _nextAgentId = 1;
    mapping(uint256 => Agent) private _agents;
    mapping(address => uint256[]) private _ownerAgents;
    mapping(bytes32 => uint256[]) private _categoryAgents;

    // ─── Modifiers ───

    modifier onlyOwner() {
        require(msg.sender == owner, "FabricRegistry: not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "FabricRegistry: not operator");
        _;
    }

    modifier onlyAgentOwner(uint256 agentId) {
        require(_agents[agentId].owner == msg.sender, "FabricRegistry: not agent owner");
        _;
    }

    modifier agentExists(uint256 agentId) {
        require(_agents[agentId].registeredAt > 0, "FabricRegistry: agent not found");
        _;
    }

    // ─── Constructor ───

    constructor(address _operator) {
        owner = msg.sender;
        operator = _operator;
    }

    // ─── Admin ───

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "FabricRegistry: zero address");
        owner = newOwner;
    }

    // ─── Agent Management ───

    function registerAgent(
        string calldata name,
        string calldata category,
        string calldata endpoint
    ) external returns (uint256 agentId) {
        require(bytes(name).length > 0 && bytes(name).length <= 128, "FabricRegistry: invalid name");
        require(bytes(category).length > 0 && bytes(category).length <= 64, "FabricRegistry: invalid category");
        require(bytes(endpoint).length > 0 && bytes(endpoint).length <= 512, "FabricRegistry: invalid endpoint");

        agentId = _nextAgentId++;

        _agents[agentId] = Agent({
            owner: msg.sender,
            endpoint: endpoint,
            category: category,
            name: name,
            reputationScore: 0,
            totalInteractions: 0,
            registeredAt: block.timestamp,
            active: true
        });

        _ownerAgents[msg.sender].push(agentId);
        _categoryAgents[keccak256(bytes(category))].push(agentId);

        emit AgentRegistered(agentId, msg.sender, name, category, endpoint);
    }

    function updateAgent(
        uint256 agentId,
        string calldata endpoint,
        string calldata category
    ) external agentExists(agentId) onlyAgentOwner(agentId) {
        require(bytes(endpoint).length > 0 && bytes(endpoint).length <= 512, "FabricRegistry: invalid endpoint");
        require(bytes(category).length > 0 && bytes(category).length <= 64, "FabricRegistry: invalid category");

        Agent storage agent = _agents[agentId];

        bytes32 oldCatHash = keccak256(bytes(agent.category));
        bytes32 newCatHash = keccak256(bytes(category));

        if (oldCatHash != newCatHash) {
            _removeCategoryEntry(oldCatHash, agentId);
            _categoryAgents[newCatHash].push(agentId);
        }

        agent.endpoint = endpoint;
        agent.category = category;

        emit AgentUpdated(agentId, endpoint, category);
    }

    function deactivateAgent(uint256 agentId) external agentExists(agentId) onlyAgentOwner(agentId) {
        require(_agents[agentId].active, "FabricRegistry: already inactive");
        _agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }

    function reactivateAgent(uint256 agentId) external agentExists(agentId) onlyAgentOwner(agentId) {
        require(!_agents[agentId].active, "FabricRegistry: already active");
        _agents[agentId].active = true;
        emit AgentReactivated(agentId);
    }

    // ─── Reputation ───

    function updateReputation(
        uint256 agentId,
        uint256 newScore,
        uint256 interactions
    ) external agentExists(agentId) onlyOperator {
        require(newScore <= 50000, "FabricRegistry: score exceeds max");

        Agent storage agent = _agents[agentId];
        uint256 oldScore = agent.reputationScore;

        agent.reputationScore = newScore;
        agent.totalInteractions += interactions;

        emit ReputationUpdated(agentId, oldScore, newScore, agent.totalInteractions);
    }

    function batchUpdateReputation(
        uint256[] calldata agentIds,
        uint256[] calldata newScores,
        uint256[] calldata interactions
    ) external onlyOperator {
        require(
            agentIds.length == newScores.length && agentIds.length == interactions.length,
            "FabricRegistry: array length mismatch"
        );
        require(agentIds.length <= 100, "FabricRegistry: batch too large");

        for (uint256 i = 0; i < agentIds.length; i++) {
            require(_agents[agentIds[i]].registeredAt > 0, "FabricRegistry: agent not found");
            require(newScores[i] <= 50000, "FabricRegistry: score exceeds max");

            Agent storage agent = _agents[agentIds[i]];
            agent.reputationScore = newScores[i];
            agent.totalInteractions += interactions[i];
        }

        emit BatchReputationUpdated(agentIds, newScores);
    }

    // ─── Queries ───

    function getAgent(uint256 agentId) external view agentExists(agentId) returns (Agent memory) {
        return _agents[agentId];
    }

    function getAgentsByCategory(
        string calldata category,
        uint256 offset,
        uint256 limit
    ) external view returns (Agent[] memory agents, uint256 total) {
        bytes32 catHash = keccak256(bytes(category));
        uint256[] storage ids = _categoryAgents[catHash];
        total = ids.length;

        if (offset >= total || limit == 0) {
            return (new Agent[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        agents = new Agent[](count);
        for (uint256 i = 0; i < count; i++) {
            agents[i] = _agents[ids[offset + i]];
        }
    }

    function getReputation(uint256 agentId) external view agentExists(agentId) returns (uint256 score, uint256 interactions) {
        Agent storage agent = _agents[agentId];
        return (agent.reputationScore, agent.totalInteractions);
    }

    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    function isActive(uint256 agentId) external view returns (bool) {
        return _agents[agentId].registeredAt > 0 && _agents[agentId].active;
    }

    function getAgentsByOwner(address ownerAddr) external view returns (uint256[] memory) {
        return _ownerAgents[ownerAddr];
    }

    // ─── Internal ───

    function _removeCategoryEntry(bytes32 catHash, uint256 agentId) internal {
        uint256[] storage ids = _categoryAgents[catHash];
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == agentId) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                return;
            }
        }
    }
}
