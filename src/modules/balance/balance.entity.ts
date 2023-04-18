import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Balance {
  @PrimaryGeneratedColumn()
  vid: number;

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
