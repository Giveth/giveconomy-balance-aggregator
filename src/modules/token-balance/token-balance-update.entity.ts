import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class TokenBalanceUpdate {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  address: string;

  @Index()
  @UpdateDateColumn({
    type: 'timestamp',
  })
  update_at: Date;
}
