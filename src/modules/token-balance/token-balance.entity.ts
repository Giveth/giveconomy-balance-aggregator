import {
  Column,
  Entity,
  Exclusion,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
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
  @Index()
  @Index({ where: 'UPPER_INF("blockRange")' })
  @Column()
  address: string;

  // Precision 78, scale 0 is enough for 32 Bytes size integers in range [0, 2^256)
  @Column('numeric', { precision: 78, scale: 0 })
  balance: string;

  @Index()
  @Column({ type: 'integer' })
  network: number;

  @Column({ type: 'tsrange' })
  timeRange: string;

  @Column({ type: 'int4range' })
  blockRange: string;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  update_at: Date;
}
