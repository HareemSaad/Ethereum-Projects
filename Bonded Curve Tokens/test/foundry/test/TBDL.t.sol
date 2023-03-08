// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;


import "contracts/TokenBondingCurve_Linear.sol";
import "lib/forge-std/src/Test.sol";


contract TokenBondingCurve_LinearTest is Test {
    TokenBondingCurve_Linear public tbcl;     
    address user = address(1);
    address deployer = address(100);
    uint totalSupplySlot = 2;
    event tester(uint);

    function setUp() public {
        vm.prank(deployer);
        tbcl = new TokenBondingCurve_Linear("alphabet", "abc", 2, 1000000000);
    }

    function testBuy() public {
        uint amount = 5;
        uint oldBal = address(tbcl).balance;
        uint val = tbcl.calculatePriceForBuy(amount);
        vm.deal(user, 1 ether);
        vm.startPrank(user);
        tbcl.buy{value: val}(amount);
        assertEq(tbcl.totalSupply(), amount);
        assertEq(address(tbcl).balance, oldBal + val);
        vm.stopPrank();
    }

    function testCannot_Buy() public {
        // bytes calldata err = bytes("LowOnEther(0, 0)");
        // vm.expectRevert(err);
        vm.expectRevert(
            abi.encodeWithSelector(LowOnEther.selector, 0, 0)
        );
        // vm.expectRevert("LowOnEther(0, 0)");
        vm.startPrank(user);
        tbcl.buy(5);
        vm.stopPrank();
    }

    function testBuy_withFuzzing(uint amount, uint total_supply_) public {
        // vm.assume(amount > 40000050 && amount < 50000000);
        vm.store(address(tbcl), bytes32(totalSupplySlot), bytes32(total_supply_));
        uint256 old_total_supply = uint256(vm.load(address(tbcl), bytes32(totalSupplySlot)));  
        console.log(tbcl.totalSupply());
        vm.assume(amount > 0 && amount < 100);
        vm.assume(total_supply_ < 900000000);
        uint oldBal = address(tbcl).balance;
        uint val = tbcl.calculatePriceForBuy(amount);
        vm.deal(user, 1000000000000000000000000000000000000 ether);
        vm.startPrank(user);
        tbcl.buy{value: val}(amount);
        assertEq(tbcl.totalSupply(), old_total_supply + amount);
        console.log(tbcl.totalSupply(), tbcl.totalSupply() + amount);
        assertEq(address(tbcl).balance, oldBal + val);
        vm.stopPrank();
    }

    function testSystem_withFuzzing(uint amount) public {
        // vm.assume(amount > 40000050 && amount < 50000000);
        //assumptions
        
        vm.assume(amount > 0 && amount <= 100);

        //save some variables
        uint oldBal = address(tbcl).balance;
        uint val = tbcl.calculatePriceForBuy(amount);

        //deal user some ether
        vm.deal(user, 1000000000000000000000000000000000000 ether); 

        //start
        vm.prank(user);

        //*****************************************************************
        //buy tkns
        tbcl.buy{value: val}(amount);

        //read from slot zero to find out tax
        // bytes32 _tax = vm.load(address(tbcl), bytes32(uint256(0)));
        // uint256 tax = (uint256(_tax));

        //check if total supply increases
        assertEq(tbcl.totalSupply(), amount);

        //check if balance increases
        assertEq(address(tbcl).balance, oldBal + val);

        //check if tax is zero
        vm.prank(tbcl.owner());
        assertEq(tbcl.viewTax(), 0);

        oldBal = address(tbcl).balance;

        //*****************************************************************
        //buy 10 more tokens
        uint price1 = tbcl.calculatePriceForBuy(10);
        vm.prank(user);
        tbcl.buy{value: price1}(10);

        //check if total supply increases
        assertEq(tbcl.totalSupply(), amount + 10);

        //check if balance increases
        assertEq(address(tbcl).balance, oldBal + price1);

        //check if tax is zero
        vm.prank(tbcl.owner());
        assertEq(tbcl.viewTax(), 0);

        oldBal = address(tbcl).balance;

        //*****************************************************************
        //sell 5 tokens
        uint cs = tbcl.totalSupply();

        uint price2 = tbcl.calculatePriceForSell(5);
        vm.prank(user);
        tbcl.sell(5);

        //find out tax
        vm.prank(tbcl.owner());
        uint tax = tbcl.viewTax();

        //TODO: fix assertions from here
        //check if total supply increases
        assertEq(tbcl.totalSupply(), cs - 5);

        //check if balance decreases
        assertEq(address(tbcl).balance, oldBal - price2 + tax);

        //check if tax is not zero
        assertEq(tax, ((price2 * 1000) / 10000));

        //*****************************************************************
        //sell rest of tokens
        uint price3 = tbcl.calculatePriceForSell(tbcl.totalSupply());
        uint ts = tbcl.totalSupply();
        vm.prank(user);
        tbcl.sell(ts);

        //find out tax
        vm.prank(tbcl.owner());
        tax = tbcl.viewTax();

        //check if total supply decreases
        assertEq(tbcl.totalSupply(), 0);

        //check if tax is not zero
        assertEq(tax, ((price3 * 1000) / 10000) + ((price2 * 1000) / 10000));

        //check if balance decreases
        assertEq(address(tbcl).balance, tax);

        //*****************************************************************
        uint oldOwnerBal = tbcl.owner().balance;
        vm.prank(tbcl.owner());
        tbcl.withdraw();
        emit tester(tbcl.owner().balance);
        assertEq(tbcl.owner().balance, oldOwnerBal + tax);

    }

    function testCannot_Sell() public {
        vm.expectRevert(
            abi.encodeWithSelector(LowOnTokens.selector, 6, 0)
        );
        vm.startPrank(user);
        tbcl.sell(6);
        vm.stopPrank();
    }

    function testCannot_Withdraw() public {
        vm.expectRevert(
            abi.encodeWithSelector(LowOnEther.selector, 0, 0)
        );
        vm.startPrank(deployer);
        tbcl.withdraw();
        vm.stopPrank();
    }
}
