
# CHARITY DAO

This DAO is created to manage charities. Users can become a part of this DAO by purchasing the **comet token**. Then the users can propose a suggestion for a charity which others can vote on or the user can vote on other's proposals.

It comes with a DAO contract, a token contract, a test for DAO contract, and a script that deploys the DAO contract.



## Features

- Once you have voted on a proposal you can unvote given that the proposal is still active
- If you change your mind about your proposal you can cancel your proposal. This way no funds are transferred to the recipient.
- All information regarding the proposal is given from the amount proposed to the recipient and the notion.
- The amount of tokens you have determine the weight of your vote. 3 tokens mean that your vote/un-vote is counted thrice.


## Running Tests

To run tests, run the following command

```bash
  npx hardhat test
```

## Deploy Script Locally

To Deploy script locally, run the following command

```bash
  npx hardhat run scripts/deploy.js
```
this will deploy the contract to your local machine
