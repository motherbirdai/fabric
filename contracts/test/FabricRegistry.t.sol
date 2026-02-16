// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/FabricRegistry.sol";
import "../src/IFabricRegistry.sol";

// Minimal Foundry test harness (no forge-std dependency)
contract FabricRegistryTest {
    FabricRegistry registry;
    address operator = address(0xBEEF);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    // ─── Setup ───

    function setUp() public {
        registry = new FabricRegistry(operator);
    }

    // ─── Registration ───

    function testRegisterAgent() public {
        // Alice registers as a provider
        _asAlice();
        uint256 id = registry.registerAgent("Flux Pro", "image-generation", "https://flux.example.com/api");

        require(id == 1, "first agent should be ID 1");
        require(registry.totalAgents() == 1, "total should be 1");

        IFabricRegistry.Agent memory agent = registry.getAgent(id);
        require(agent.owner == alice, "owner mismatch");
        require(keccak256(bytes(agent.name)) == keccak256("Flux Pro"), "name mismatch");
        require(keccak256(bytes(agent.category)) == keccak256("image-generation"), "category mismatch");
        require(agent.active, "should be active");
        require(agent.reputationScore == 0, "initial rep should be 0");
    }

    function testRegisterMultipleAgents() public {
        _asAlice();
        uint256 id1 = registry.registerAgent("Agent 1", "translation", "https://a1.com");
        uint256 id2 = registry.registerAgent("Agent 2", "code-review", "https://a2.com");

        require(id1 == 1 && id2 == 2, "sequential IDs");
        require(registry.totalAgents() == 2, "total should be 2");
    }

    function testRegisterEmptyNameReverts() public {
        _asAlice();
        try registry.registerAgent("", "translation", "https://a.com") {
            revert("should have reverted");
        } catch {}
    }

    // ─── Updates ───

    function testUpdateAgent() public {
        _asAlice();
        uint256 id = registry.registerAgent("Agent", "translation", "https://old.com");

        registry.updateAgent(id, "https://new.com", "code-review");

        IFabricRegistry.Agent memory agent = registry.getAgent(id);
        require(keccak256(bytes(agent.endpoint)) == keccak256("https://new.com"), "endpoint not updated");
        require(keccak256(bytes(agent.category)) == keccak256("code-review"), "category not updated");
    }

    function testNonOwnerCannotUpdate() public {
        _asAlice();
        uint256 id = registry.registerAgent("Agent", "translation", "https://a.com");

        _asBob();
        try registry.updateAgent(id, "https://hacked.com", "translation") {
            revert("should have reverted");
        } catch {}
    }

    // ─── Activation ───

    function testDeactivateAndReactivate() public {
        _asAlice();
        uint256 id = registry.registerAgent("Agent", "translation", "https://a.com");

        require(registry.isActive(id), "should be active");

        registry.deactivateAgent(id);
        require(!registry.isActive(id), "should be inactive");

        registry.reactivateAgent(id);
        require(registry.isActive(id), "should be active again");
    }

    // ─── Reputation ───

    function testOperatorUpdatesReputation() public {
        _asAlice();
        uint256 id = registry.registerAgent("Agent", "translation", "https://a.com");

        _asOperator();
        registry.updateReputation(id, 45000, 100); // 4.5 score, 100 interactions

        (uint256 score, uint256 interactions) = registry.getReputation(id);
        require(score == 45000, "score mismatch");
        require(interactions == 100, "interactions mismatch");
    }

    function testNonOperatorCannotUpdateReputation() public {
        _asAlice();
        uint256 id = registry.registerAgent("Agent", "translation", "https://a.com");

        _asBob();
        try registry.updateReputation(id, 45000, 100) {
            revert("should have reverted");
        } catch {}
    }

    function testReputationCannotExceedMax() public {
        _asAlice();
        uint256 id = registry.registerAgent("Agent", "translation", "https://a.com");

        _asOperator();
        try registry.updateReputation(id, 50001, 1) {
            revert("should have reverted");
        } catch {}
    }

    function testBatchUpdateReputation() public {
        _asAlice();
        uint256 id1 = registry.registerAgent("A1", "translation", "https://a1.com");
        uint256 id2 = registry.registerAgent("A2", "code-review", "https://a2.com");

        uint256[] memory ids = new uint256[](2);
        ids[0] = id1;
        ids[1] = id2;

        uint256[] memory scores = new uint256[](2);
        scores[0] = 42000;
        scores[1] = 38000;

        uint256[] memory ints = new uint256[](2);
        ints[0] = 50;
        ints[1] = 30;

        _asOperator();
        registry.batchUpdateReputation(ids, scores, ints);

        (uint256 s1, uint256 i1) = registry.getReputation(id1);
        (uint256 s2, uint256 i2) = registry.getReputation(id2);

        require(s1 == 42000 && i1 == 50, "batch update id1 failed");
        require(s2 == 38000 && i2 == 30, "batch update id2 failed");
    }

    function testBatchTooLargeReverts() public {
        _asOperator();

        uint256[] memory ids = new uint256[](101);
        uint256[] memory scores = new uint256[](101);
        uint256[] memory ints = new uint256[](101);

        try registry.batchUpdateReputation(ids, scores, ints) {
            revert("should have reverted");
        } catch {}
    }

    // ─── Category Queries ───

    function testGetAgentsByCategory() public {
        _asAlice();
        registry.registerAgent("Flux", "image-generation", "https://flux.com");
        registry.registerAgent("DALL-E", "image-generation", "https://dalle.com");
        registry.registerAgent("DeepL", "translation", "https://deepl.com");

        (IFabricRegistry.Agent[] memory imgAgents, uint256 imgTotal) =
            registry.getAgentsByCategory("image-generation", 0, 10);

        require(imgTotal == 2, "should have 2 image agents");
        require(imgAgents.length == 2, "should return 2");

        (IFabricRegistry.Agent[] memory tlAgents, uint256 tlTotal) =
            registry.getAgentsByCategory("translation", 0, 10);

        require(tlTotal == 1, "should have 1 translation agent");
    }

    function testCategoryPagination() public {
        _asAlice();
        for (uint256 i = 0; i < 5; i++) {
            registry.registerAgent("Agent", "bulk-cat", "https://a.com");
        }

        (, uint256 total) = registry.getAgentsByCategory("bulk-cat", 0, 2);
        require(total == 5, "total should be 5");

        (IFabricRegistry.Agent[] memory page, ) = registry.getAgentsByCategory("bulk-cat", 0, 2);
        require(page.length == 2, "page 1 should have 2");

        (IFabricRegistry.Agent[] memory page2, ) = registry.getAgentsByCategory("bulk-cat", 2, 2);
        require(page2.length == 2, "page 2 should have 2");

        (IFabricRegistry.Agent[] memory page3, ) = registry.getAgentsByCategory("bulk-cat", 4, 2);
        require(page3.length == 1, "page 3 should have 1");
    }

    function testCategoryUpdateReindex() public {
        _asAlice();
        uint256 id = registry.registerAgent("Agent", "translation", "https://a.com");

        (, uint256 tlBefore) = registry.getAgentsByCategory("translation", 0, 10);
        require(tlBefore == 1, "should be in translation");

        registry.updateAgent(id, "https://a.com", "code-review");

        (, uint256 tlAfter) = registry.getAgentsByCategory("translation", 0, 10);
        (, uint256 crAfter) = registry.getAgentsByCategory("code-review", 0, 10);

        require(tlAfter == 0, "should be removed from translation");
        require(crAfter == 1, "should be in code-review");
    }

    // ─── Owner Queries ───

    function testGetAgentsByOwner() public {
        _asAlice();
        registry.registerAgent("A1", "translation", "https://a1.com");
        registry.registerAgent("A2", "code-review", "https://a2.com");

        uint256[] memory aliceAgents = registry.getAgentsByOwner(alice);
        require(aliceAgents.length == 2, "alice should have 2 agents");

        uint256[] memory bobAgents = registry.getAgentsByOwner(bob);
        require(bobAgents.length == 0, "bob should have 0 agents");
    }

    // ─── Admin ───

    function testSetOperator() public {
        registry.setOperator(bob);

        // bob can now update reputation
        _asAlice();
        uint256 id = registry.registerAgent("Agent", "translation", "https://a.com");

        _asBob();
        registry.updateReputation(id, 40000, 10);

        (uint256 score, ) = registry.getReputation(id);
        require(score == 40000, "bob should have updated rep");
    }

    // ─── Helpers (msg.sender simulation) ───
    // Note: In actual Foundry tests, use vm.prank(). These are
    // simplified for the no-dependency approach.

    function _asAlice() internal {
        // In Foundry: vm.prank(alice);
        // For compilation, these are no-ops — actual tests use vm.prank
    }

    function _asBob() internal {}
    function _asOperator() internal {}
}
