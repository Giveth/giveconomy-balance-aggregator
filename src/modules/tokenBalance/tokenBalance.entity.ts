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
export class TokenBalance {
  @PrimaryGeneratedColumn()
  id: number;

  // User wallet address
  @Column()
  address: string;

  // Precision 78, scale 0 is enough for 32 Bytes size integers in range [0, 2^256)
  @Column('numeric', { precision: 78, scale: 0 })
  balance: string;

  @Column({ type: 'integer' })
  network: number;

  @Column({ type: 'tstzrange' })
  timeRange: string;

  @Column({ type: 'int4range' })
  blockRange: string;
}
