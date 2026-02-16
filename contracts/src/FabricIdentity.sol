// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FabricIdentity
 * @notice ERC-721 identity NFT for Fabric agents.
 *
 *         Each agent gets a soulbound (non-transferable) NFT that serves
 *         as its on-chain identity. The NFT stores:
 *           - Agent name
 *           - Registry ID (links to FabricRegistry)
 *           - Creation timestamp
 *
 *         Only the Fabric operator can mint identities.
 *         Tokens are soulbound — transfer is disabled.
 *
 *         Implements ERC-721 manually (no OpenZeppelin dependency)
 *         to keep deployment gas minimal on Base L2.
 */
contract FabricIdentity {
    // ─── ERC-721 State ───

    string public name = "Fabric Agent Identity";
    string public symbol = "FABRIC-ID";

    address public owner;
    address public operator;

    uint256 private _nextTokenId = 1;
    uint256 private _totalSupply;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // ─── Agent Data ───

    struct AgentData {
        string agentName;
        uint256 registryId;
        uint256 createdAt;
    }

    mapping(uint256 => AgentData) private _agentData;
    mapping(uint256 => uint256) private _registryToToken; // registryId → tokenId

    // ─── Events ───

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event AgentMinted(uint256 indexed tokenId, address indexed to, string agentName, uint256 registryId);

    // ─── Modifiers ───

    modifier onlyOwner() {
        require(msg.sender == owner, "FabricIdentity: not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "FabricIdentity: not operator");
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
        require(newOwner != address(0), "FabricIdentity: zero address");
        owner = newOwner;
    }

    // ─── Minting ───

    /**
     * @notice Mint a new agent identity NFT.
     * @param to      The agent's wallet address
     * @param agentName  Human-readable name
     * @param registryId Link to FabricRegistry agent ID
     */
    function mint(
        address to,
        string calldata agentName,
        uint256 registryId
    ) external onlyOperator returns (uint256 tokenId) {
        require(to != address(0), "FabricIdentity: mint to zero");
        require(bytes(agentName).length > 0, "FabricIdentity: empty name");
        require(_registryToToken[registryId] == 0, "FabricIdentity: registry ID already minted");

        tokenId = _nextTokenId++;
        _totalSupply++;

        _owners[tokenId] = to;
        _balances[to]++;

        _agentData[tokenId] = AgentData({
            agentName: agentName,
            registryId: registryId,
            createdAt: block.timestamp
        });

        _registryToToken[registryId] = tokenId;

        emit Transfer(address(0), to, tokenId);
        emit AgentMinted(tokenId, to, agentName, registryId);
    }

    // ─── Agent Queries ───

    function getAgentData(uint256 tokenId) external view returns (AgentData memory) {
        require(_owners[tokenId] != address(0), "FabricIdentity: token not found");
        return _agentData[tokenId];
    }

    function tokenByRegistryId(uint256 registryId) external view returns (uint256) {
        uint256 tokenId = _registryToToken[registryId];
        require(tokenId != 0, "FabricIdentity: not found");
        return tokenId;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    // ─── ERC-721 Standard ───

    function balanceOf(address _ownerAddr) external view returns (uint256) {
        require(_ownerAddr != address(0), "FabricIdentity: zero address");
        return _balances[_ownerAddr];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "FabricIdentity: token not found");
        return tokenOwner;
    }

    /**
     * @notice Transfer is disabled — tokens are soulbound.
     */
    function transferFrom(address, address, uint256) external pure {
        revert("FabricIdentity: soulbound — transfer disabled");
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert("FabricIdentity: soulbound — transfer disabled");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("FabricIdentity: soulbound — transfer disabled");
    }

    function approve(address, uint256) external pure {
        revert("FabricIdentity: soulbound — approval disabled");
    }

    function setApprovalForAll(address, bool) external pure {
        revert("FabricIdentity: soulbound — approval disabled");
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    // ─── ERC-165 ───

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x01ffc9a7;   // ERC-165
    }

    // ─── Token URI ───

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "FabricIdentity: token not found");

        AgentData memory data = _agentData[tokenId];

        // On-chain JSON metadata
        return string(abi.encodePacked(
            'data:application/json,{"name":"',
            data.agentName,
            '","description":"Fabric Agent Identity","attributes":[{"trait_type":"Registry ID","value":"',
            _toString(data.registryId),
            '"},{"trait_type":"Created","value":"',
            _toString(data.createdAt),
            '"}]}'
        ));
    }

    // ─── Utils ───

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
