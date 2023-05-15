import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

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
}
