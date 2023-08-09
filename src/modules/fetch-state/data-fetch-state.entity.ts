import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class DataFetchState {
  @PrimaryColumn()
  id: string;

  @Column()
  contractAddress: string;

  @Column()
  network: number;

  @Column()
  lastUpdateTime: number;

  @Column()
  lastBlockNumber: number;

  @Column()
  paginationSkip: number;

  @Column()
  latestIndexedBlockNumber: number;

  @Column()
  latestIndexedBlockTimestamp: number;

  @Column({ default: false })
  isActive: boolean;
}
