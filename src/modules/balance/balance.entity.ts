import {
  Column,
  Entity,
  Exclusion,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
@Exclusion(`USING gist (address WITH =, network WITH =, "timeRange" WITH &&)`)
@Exclusion(`USING gist (address WITH =, network WITH =, "blockRange" WITH &&)`)
@Index(['address', 'network', 'timeRange'])
@Index(['address', 'network', 'blockRange'])
export class Balance {
  @PrimaryGeneratedColumn()
  id: number;

  // User wallet address
  @Column()
  address: string;

  @Column()
  balance: string;

  @Column({ type: 'integer' })
  network: number;

  @Column({ type: 'tstzrange' })
  timeRange: string;

  @Column({ type: 'int4range' })
  blockRange: string;
}
