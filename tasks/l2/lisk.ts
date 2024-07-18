import { BigNumber } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { task } from 'hardhat/config';
import { ADDRESSES, CONSTANTS } from '../../helpers/gov-constants';

import { DRE } from '../../helpers/misc-utils';
import { eEthereumNetwork, eLiskNetwork } from '../../helpers/types';
import {
  Greeter__factory,
  ICrossDomainMessenger__factory,
  OptimismBridgeExecutor__factory,
} from '../../typechain';

task(
  'lisk:initiate-greeting',
  'Queue a greeting in the governance executor on Lisk by transacting on L1'
).setAction(async (_, hre) => {
  await hre.run('set-DRE');

  if (DRE.network.name != eEthereumNetwork.sepolia && DRE.network.name != eEthereumNetwork.main) {
    throw new Error('Only applicable on mainnet or sepolia where lisk L2 exist');
  }

  const GAS_LIMIT = 1500000;
  const MESSAGE = 'Alessandro was also here';

  let OVM_L1_MESSENGER = ADDRESSES['OVM_L1_MESSENGER_LISK_MAINNET'];
  if (DRE.network.name == eEthereumNetwork.sepolia) {
    OVM_L1_MESSENGER = ADDRESSES['OVM_L1_MESSENGER_LISK_SEPOLIA'];
  }

  const l2 = DRE.companionNetworks['lisk'];

  const { deployer: deployerAddress } = await DRE.getNamedAccounts();
  const deployer = await DRE.ethers.getSigner(deployerAddress);
  console.log(
    `Deployer address: ${deployer.address} (${formatUnits(await deployer.getBalance())})`
  );

  // Note, the contract is on the lisk network, but only used to encode so no issue
  const liskGov = OptimismBridgeExecutor__factory.connect(
    (await l2.deployments.get('LiskGov')).address,
    deployer
  );
  console.log(`Optimistic Gov at ${liskGov.address}`);

  // Note, the contract is on the lisk network, but only used to encode so no issue
  const greeter = Greeter__factory.connect((await l2.deployments.get('Greeter')).address, deployer);
  console.log(`Greeter at ${greeter.address}`);

  const messenger = ICrossDomainMessenger__factory.connect(OVM_L1_MESSENGER, deployer);
  console.log(`OVM_L1_MESSENGER at: ${messenger.address}`);

  const encodedGreeting = greeter.interface.encodeFunctionData('setMessage', [MESSAGE]);

  const targets: string[] = [greeter.address];
  const values: BigNumber[] = [BigNumber.from(0)];
  const signatures: string[] = [''];
  const calldatas: string[] = [encodedGreeting];
  const withDelegatecalls: boolean[] = [false];

  const encodedQueue = liskGov.interface.encodeFunctionData('queue', [
    targets,
    values,
    signatures,
    calldatas,
    withDelegatecalls,
  ]);

  const tx = await messenger.sendMessage(liskGov.address, encodedQueue, GAS_LIMIT);
  console.log(`Transaction initiated: ${tx.hash}`);
});

task('lisk:execute-greeting', '')
  .addParam('id', 'Id of the proposal to execute')
  .setAction(async (taskArg, hre) => {
    await hre.run('set-DRE');

    if (DRE.network.name != eLiskNetwork.main && DRE.network.name != eLiskNetwork.testnet) {
      throw new Error('Only applicable on lisk L2');
    }

    const id = taskArg.id;

    const { deployer: deployerAddress } = await DRE.getNamedAccounts();
    const deployer = await DRE.ethers.getSigner(deployerAddress);
    console.log(
      `Deployer address: ${deployer.address} (${formatUnits(await deployer.getBalance())})`
    );

    // Note, the contract is on the lisk network, but only used to encode so no issue
    const liskGov = OptimismBridgeExecutor__factory.connect(
      (await DRE.deployments.get('LiskGov')).address,
      deployer
    );
    console.log(`Optimistic Gov at ${liskGov.address}`);

    // Note, the contract is on the lisk network, but only used to encode so no issue
    const greeter = Greeter__factory.connect(
      (await DRE.deployments.get('Greeter')).address,
      deployer
    );
    console.log(`Greeter at ${greeter.address}`);

    const tx = await liskGov.execute(id);

    console.log(`Transaction initiated: ${tx.hash}`);
  });
