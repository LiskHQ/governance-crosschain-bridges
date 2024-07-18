import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ADDRESSES, CONSTANTS } from '../helpers/gov-constants';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log(`Deployer: ${deployer}\n`);

  const liskGov = await deployments.getOrNull('LiskGov');

  if (liskGov) {
    log(`Reusing optimistic governance at: ${liskGov.address}`);
  } else {
    await deploy('LiskGov', {
      args: [
        ADDRESSES['OVM_L2_MESSENGER'],
        ADDRESSES['ETHEREUM_GOV_EXECUTOR_SEPOLIA'],
        CONSTANTS['DELAY'],
        CONSTANTS['GRACE_PERIOD'],
        CONSTANTS['MIN_DELAY'],
        CONSTANTS['MAX_DELAY'],
        ADDRESSES['OVM_GUARDIAN'],
      ],
      contract: 'OptimismBridgeExecutor',
      from: deployer,
      log: true,
    });
  }
};

export default func;
func.dependencies = [];
func.tags = ['LiskGov'];
