# CrowdFunding

This project demonstrates the concept of crowd funding in a decentralized manner.
By opting for decentralization, donors can trust the reciver to spend the money on what they had initially agreed upon as the donors have a say in the expenditure of money


Try running ```npx hardhat test``` to run pre written test


In my version, the donors and the owner have rights and have to follow some rules.


<b>RULES: </b>

01- Owner cannot fund thier own contract - hence owner will have no say in the votes.

02- Once the contract is deployed an agreed upon deadline is set donors can only contribute within this deadline

03- If this deadline ends and 2 basic conditions are not met (total contributers > 3 and total contributions > minimum target) the contract is deemed worthless all the contract is able to do now is allow donors to recover their funds.

04- If dead line ends and both conditions are met the owner can open polls and have the donors vote.

05- If votes for a poll are greater than 50 % owner can spend the money other wise not.
<<<<<<< HEAD

=======
>>>>>>> 4a11ccd1e623e141d633f2d4598df8d6edf59f02
