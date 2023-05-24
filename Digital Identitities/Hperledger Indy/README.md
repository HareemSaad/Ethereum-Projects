# Hyperledger Indy SDK

For Ubuntu 18.04

# Install libindy
```shell
sudo apt-get install ca-certificates -y
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys CE7709D068DB5E88
sudo add-apt-repository "deb https://repo.sovrin.org/sdk/deb bionic stable"
sudo apt-get update
sudo apt-get install -y libindy
```

# Install Indy SDK
```shell
pip3 install python3-indy

# OR

pip3 install python3-indy==1.4
```
this code is compatible with version 1.4

# Run a node
```shell
sudo docker ps

sudo docker run -itd -p 9701-9708:9701-9708 ghoshbishakh/indy_pool

sudo docker ps

sudo docker exec -it <container id> bash

tail -f /var/log/indy/sandbox/Node1.log

# press Cntrl C

cat /var/lib/indy/sandbox/

ls /var/lib/indy/sandbox/

cat /var/lib/indy/sandbox/pool_transactions_genesis
```

- <b>Before</b> running these commands create a pool1.txn
- <b>After</b> this step save these 4 transaction logs to pool1.txn file
- then run ```python3 main.py```
