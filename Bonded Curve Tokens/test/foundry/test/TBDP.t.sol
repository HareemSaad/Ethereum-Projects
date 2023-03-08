// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;


import "contracts/TokenBondingCurve_Polynomial.sol";
import "lib/forge-std/src/Test.sol";


contract TokenBondingCurve_PolynomialTest is Test {
    TokenBondingCurve_Polynomial public tbcp;     
    address user = address(1);
    address deployer = address(100);
    uint totalSupplySlot = 2;
    event tester(uint);

    function setUp() public {
        vm.prank(deployer);
        tbcp = new TokenBondingCurve_Polynomial("alphabet", "abc", 4, 1, 1000000000);
    }

    function testBuy() public {
        uint amount = 5;
        uint oldBal = address(tbcp).balance;
        uint val = tbcp.calculatePriceForBuy(amount);
        vm.deal(user, 1 ether);
        vm.startPrank(user);
        tbcp.buy{value: val}(amount);
        assertEq(tbcp.totalSupply(), amount);
        assertEq(address(tbcp).balance, oldBal + val);
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
        tbcp.buy(5);
        vm.stopPrank();
    }

    function testBuy_withFuzzing(uint amount, uint total_supply_) public {
        // vm.assume(amount > 40000050 && amount < 50000000);
        vm.store(address(tbcp), bytes32(totalSupplySlot), bytes32(total_supply_));
        uint256 old_total_supply = uint256(vm.load(address(tbcp), bytes32(totalSupplySlot)));  
        console.log(tbcp.totalSupply());
        vm.assume(amount > 0 && amount < 100);
        vm.assume(total_supply_ < 900000000);
        uint oldBal = address(tbcp).balance;
        uint val = tbcp.calculatePriceForBuy(amount);
        vm.deal(user, 1000000000000000000000000000000000000 ether);
        vm.startPrank(user);
        tbcp.buy{value: val}(amount);
        assertEq(tbcp.totalSupply(), old_total_supply + amount);
        console.log(tbcp.totalSupply(), tbcp.totalSupply() + amount);
        assertEq(address(tbcp).balance, oldBal + val);
        vm.stopPrank();
    }

    function testSystem_withFuzzing(uint amount) public {
        // vm.assume(amount > 40000050 && amount < 50000000);
        //assumptions
        
        vm.assume(amount > 0 && amount <= 100);

        //save some variables
        uint oldBal = address(tbcp).balance;
        uint val = tbcp.calculatePriceForBuy(amount);

        //deal user some ether
        vm.deal(user, 1000000000000000000000000000000000000 ether); 

        //start
        vm.prank(user);

        //*****************************************************************
        //buy tkns
        tbcp.buy{value: val}(amount);

        //read from slot zero to find out tax
        // bytes32 _tax = vm.load(address(tbcp), bytes32(uint256(0)));
        // uint256 tax = (uint256(_tax));

        //check if total supply increases
        assertEq(tbcp.totalSupply(), amount);

        //check if balance increases
        assertEq(address(tbcp).balance, oldBal + val);

        //check if tax is zero
        vm.prank(deployer);
        assertEq(tbcp.viewTax(), 0);

        oldBal = address(tbcp).balance;

        //*****************************************************************
        //buy 10 more tokens
        uint price1 = tbcp.calculatePriceForBuy(10);
        vm.prank(user);
        tbcp.buy{value: price1}(10);

        //check if total supply increases
        assertEq(tbcp.totalSupply(), amount + 10);

        //check if balance increases
        assertEq(address(tbcp).balance, oldBal + price1);

        //check if tax is zero
        vm.prank(deployer);
        assertEq(tbcp.viewTax(), 0);

        oldBal = address(tbcp).balance;

        //*****************************************************************
        //sell 5 tokens
        uint cs = tbcp.totalSupply();

        uint price2 = tbcp.calculatePriceForSell(5);
        vm.prank(user);
        tbcp.sell(5);

        //find out tax
        vm.prank(deployer);
        uint tax = tbcp.viewTax();

        //TODO: fix assertions from here
        //check if total supply increases
        assertEq(tbcp.totalSupply(), cs - 5);

        //check if balance decreases
        assertEq(address(tbcp).balance, oldBal - price2 + tax);

        //check if tax is not zero
        assertEq(tax, ((price2 * 1000) / 10000));

        //*****************************************************************
        //sell rest of tokens
        uint price3 = tbcp.calculatePriceForSell(tbcp.totalSupply());
        uint ts = tbcp.totalSupply();
        vm.prank(user);
        tbcp.sell(ts);

        //find out tax
        vm.prank(deployer);
        tax = tbcp.viewTax();

        //check if total supply decreases
        assertEq(tbcp.totalSupply(), 0);

        //check if tax is not zero
        assertEq(tax, ((price3 * 1000) / 10000) + ((price2 * 1000) / 10000));

        //check if balance decreases
        assertEq(address(tbcp).balance, tax);

        //*****************************************************************
        uint oldOwnerBal = deployer.balance;
        vm.prank(deployer);
        tbcp.withdraw();
        emit tester(deployer.balance);
        assertEq(deployer.balance, oldOwnerBal + tax);

    }

    function testCannot_Sell() public {
        vm.expectRevert(
            abi.encodeWithSelector(LowOnTokens.selector, 6, 0)
        );
        vm.startPrank(user);
        tbcp.sell(6);
        vm.stopPrank();
    }

    function testCannot_Withdraw() public {
        vm.expectRevert(
            abi.encodeWithSelector(LowOnEther.selector, 0, 0)
        );
        vm.startPrank(deployer);
        tbcp.withdraw();
        vm.stopPrank();
    }
}
