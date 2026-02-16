// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/FabricIdentity.sol";

contract FabricIdentityTest is Test {
    FabricIdentity identity;
    address deployer = address(this);
    address operator = address(0xBEEF);
    address agent1 = address(0x1111);
    address agent2 = address(0x2222);
    address random = address(0x9999);

    bytes32 regId1 = keccak256("prov_flux_001");
    bytes32 regId2 = keccak256("prov_deepl_002");

    function setUp() public {
        identity = new FabricIdentity(operator);
    }

    // ─── Minting ───

    function test_mint() public {
        vm.prank(operator);
        uint256 tokenId = identity.mint(agent1, "Flux Pro Agent", regId1);

        assertEq(tokenId, 1);
        assertEq(identity.ownerOf(1), agent1);
        assertEq(identity.balanceOf(agent1), 1);
        assertEq(identity.totalSupply(), 1);
    }

    function test_mint_multipleTokens() public {
        vm.prank(operator);
        identity.mint(agent1, "Agent A", regId1);
        vm.prank(operator);
        identity.mint(agent2, "Agent B", regId2);

        assertEq(identity.totalSupply(), 2);
        assertEq(identity.balanceOf(agent1), 1);
        assertEq(identity.balanceOf(agent2), 1);
    }

    function test_mint_agentData() public {
        vm.prank(operator);
        identity.mint(agent1, "Flux Pro", regId1);

        (string memory name, bytes32 regId, uint256 createdAt) = identity.getAgentData(1);
        assertEq(name, "Flux Pro");
        assertEq(regId, regId1);
        assertGt(createdAt, 0);
    }

    function test_mint_revertNotOperator() public {
        vm.prank(random);
        vm.expectRevert(FabricIdentity.NotOperator.selector);
        identity.mint(agent1, "Agent", regId1);
    }

    function test_mint_revertZeroAddress() public {
        vm.prank(operator);
        vm.expectRevert(FabricIdentity.InvalidRecipient.selector);
        identity.mint(address(0), "Agent", regId1);
    }

    function test_mint_revertEmptyName() public {
        vm.prank(operator);
        vm.expectRevert(FabricIdentity.InvalidInput.selector);
        identity.mint(agent1, "", regId1);
    }

    function test_mint_revertZeroRegistryId() public {
        vm.prank(operator);
        vm.expectRevert(FabricIdentity.InvalidInput.selector);
        identity.mint(agent1, "Agent", bytes32(0));
    }

    function test_mint_revertDuplicateRegistryId() public {
        vm.prank(operator);
        identity.mint(agent1, "Agent A", regId1);

        vm.prank(operator);
        vm.expectRevert(FabricIdentity.AlreadyMinted.selector);
        identity.mint(agent2, "Agent B", regId1);
    }

    function test_ownerCanMint() public {
        // Contract owner can also mint (not just operator)
        identity.mint(agent1, "Owner Minted Agent", regId1);
        assertEq(identity.ownerOf(1), agent1);
    }

    // ─── Transfers ───

    function test_transferFrom() public {
        vm.prank(operator);
        identity.mint(agent1, "Agent", regId1);

        vm.prank(agent1);
        identity.transferFrom(agent1, agent2, 1);

        assertEq(identity.ownerOf(1), agent2);
        assertEq(identity.balanceOf(agent1), 0);
        assertEq(identity.balanceOf(agent2), 1);
    }

    function test_transferFrom_revertNotApproved() public {
        vm.prank(operator);
        identity.mint(agent1, "Agent", regId1);

        vm.prank(random);
        vm.expectRevert(FabricIdentity.NotApproved.selector);
        identity.transferFrom(agent1, agent2, 1);
    }

    function test_transferWithApproval() public {
        vm.prank(operator);
        identity.mint(agent1, "Agent", regId1);

        vm.prank(agent1);
        identity.approve(random, 1);

        vm.prank(random);
        identity.transferFrom(agent1, agent2, 1);

        assertEq(identity.ownerOf(1), agent2);
    }

    function test_transferWithOperatorApproval() public {
        vm.prank(operator);
        identity.mint(agent1, "Agent", regId1);

        vm.prank(agent1);
        identity.setApprovalForAll(random, true);

        vm.prank(random);
        identity.transferFrom(agent1, agent2, 1);

        assertEq(identity.ownerOf(1), agent2);
    }

    // ─── Enumerable ───

    function test_tokenByIndex() public {
        vm.prank(operator);
        identity.mint(agent1, "Agent A", regId1);
        vm.prank(operator);
        identity.mint(agent2, "Agent B", regId2);

        assertEq(identity.tokenByIndex(0), 1);
        assertEq(identity.tokenByIndex(1), 2);
    }

    function test_tokenOfOwnerByIndex() public {
        vm.prank(operator);
        identity.mint(agent1, "Agent A", regId1);
        vm.prank(operator);
        identity.mint(agent1, "Agent B", regId2);

        assertEq(identity.tokenOfOwnerByIndex(agent1, 0), 1);
        assertEq(identity.tokenOfOwnerByIndex(agent1, 1), 2);
        assertEq(identity.balanceOf(agent1), 2);
    }

    function test_enumerableAfterTransfer() public {
        vm.prank(operator);
        identity.mint(agent1, "Agent A", regId1);
        vm.prank(operator);
        identity.mint(agent1, "Agent B", regId2);

        vm.prank(agent1);
        identity.transferFrom(agent1, agent2, 1);

        assertEq(identity.balanceOf(agent1), 1);
        assertEq(identity.balanceOf(agent2), 1);
        assertEq(identity.tokenOfOwnerByIndex(agent2, 0), 1);
    }

    // ─── ERC-165 ───

    function test_supportsInterface_ERC721() public view {
        assertTrue(identity.supportsInterface(0x80ac58cd)); // ERC-721
    }

    function test_supportsInterface_ERC721Enumerable() public view {
        assertTrue(identity.supportsInterface(0x780e9d63)); // ERC-721 Enumerable
    }

    function test_supportsInterface_ERC165() public view {
        assertTrue(identity.supportsInterface(0x01ffc9a7)); // ERC-165
    }

    // ─── Admin ───

    function test_setOperator() public {
        address newOp = address(0xCAFE);
        identity.setOperator(newOp);
        assertEq(identity.operator(), newOp);

        // New operator can mint
        vm.prank(newOp);
        identity.mint(agent1, "Agent", regId1);
        assertEq(identity.ownerOf(1), agent1);
    }

    function test_setOperator_revertNotOwner() public {
        vm.prank(random);
        vm.expectRevert(FabricIdentity.NotOwner.selector);
        identity.setOperator(random);
    }

    function test_nameAndSymbol() public view {
        assertEq(identity.name(), "Fabric Identity");
        assertEq(identity.symbol(), "FABID");
    }
}
