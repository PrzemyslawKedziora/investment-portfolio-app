import {Component, OnInit} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {combineLatest, map, Observable} from 'rxjs';
import {TradeModel} from "../models/trade-model";
import axios from "axios";


@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit{
  maxDate: any;
  minDate: any;
  timeSinceMax:any;
  records$: Observable<TradeModel[]>;
  coinNames: string[]=[];
  coinNames2: string[]=[];
  actual: number;
  totalInv:number;
  numberOfTrades:number;
  coinNames1: string[]=[
    'bitcoin','ethereum','ripple','dogecoin','cardano','binancecoin','solana','polkadot','litecoin','tron','shiba-inu','dai','uniswap','chainlink','wrapped-bitcoin',
    'cosmos','monero','algorand'
  ];
  /*'ethereum-classic','okb','bitcoin-cash','lido-dao','stellar','filecoin','aptos','cronos','hedera','near-protocol','vechain','apecoin',
  'internet-computer','algorand','quant','eos','the-graph','fantom','decentraland','bitdao','aave','multiversx','flow','tezos','theta-network','axie-infinity','stacks','immutablex',
  'the-sandbox','maker','kucoin-token','terra-classic','neo','chiliz','huobi-token','optimism','synthetix','bitcoin-sv','dash','pancakeswap','iota','gmx','gatetoken','enjin-coin',
  'flare','zilliqa','1inch-network','osmosis','floki','dydx','terra','compound','woo-network','link','gala' - check this */
  constructor(
    private db: AngularFirestore
  ) {
    this.getMinDate();
    this.getMaxDate();
    this.sumInvestedMoney();
    this.db.collection('trades').valueChanges().pipe(
      map((trades: any[]) => trades.map((trade) => trade.coinName)),
    ).subscribe((coinNames: string[]) => {
      coinNames.forEach((coinName) => {
        if (!this.coinNames.includes(coinName)) {
          this.coinNames.push(coinName);
        }
      });
      this.coinNames=Array.from(new Set(this.coinNames));
    }); //wrzucanie nazw coinow do tablicy
    this.db.collection<TradeModel>('trades').get().subscribe(() => {
      this.getCurrentPrices();
    });
     this.getNumberOfTrades();
    console.log(this.timeSinceMax);
  }

  ngOnInit(): void {
    this.calcTime(this.minDate);
    this.calcTime(this.maxDate);
    }

  getTrades(): Observable<TradeModel[]>{
    return this.db.collection<TradeModel>('trades').snapshotChanges().pipe(map(res => res.map(trade => this.assignKey(trade))));
  }

  assignKey(trade: any){
    return {...trade.payload.val(),key: trade.key}
  }
  getMaxDate(){
    this.db.collection('trades', ref => ref
      .orderBy('date', 'asc')
      .limit(1)
    ).get().toPromise().then(querySnapshot => {
      querySnapshot.forEach(doc => {
        const data = doc.data() as { date: string};
        this.maxDate = data.date;

      });
    });
  }
  getMinDate(){
    this.db.collection('trades', ref => ref.orderBy('date',"desc").limit(1)
    ).get().toPromise().then(querySnapshot => {
      querySnapshot.forEach(doc => {
        const data = doc.data() as { date: string};
        this.minDate = data.date;

      });
    }).catch(error => {console.error(error)});
  }
  sumInvestedMoney(){
    this.db
      .collection<TradeModel>('trades')
      .snapshotChanges()
      .pipe(
        map((changes) => changes.map((c) => c.payload.doc.data().investedInUSD)),
        map((params) => params.reduce((prev, curr) => prev + curr, 0))
      )
      .subscribe((sum) => (this.totalInv = sum));
  }
  getCurrentPrices(){
    let actual1:number=0;
    this.records$ = this.db.collection<TradeModel>('trades').valueChanges();
    this.records$ = combineLatest([
      this.records$, axios.get('https://api.coingecko.com/api/v3/simple/price?ids='+this.coinNames1.toString()+'&vs_currencies=usd')
        .then(response => response.data)
    ]).pipe(
      map(([records, prices]) => {
        return records.map(record => {
          record.priceusd = prices[record.coinName.toLowerCase()].usd;
          actual1+=(record.priceusd*record.quantity);
          this.actual = Number.parseFloat(actual1.toFixed(2));
          return record;
        });
      })
    );
  }
  getNumberOfTrades(){
    this.db.collection('trades').get().toPromise().then(snapshot => {
      this.numberOfTrades = snapshot.size;
    })
}
calcTime(date: any){
  let currentDate = new Date().toISOString();
  let date1 = Number(Date.parse(date));
  let date2 =Number(Date.parse(currentDate));
  return  Math.ceil((date2 - date1)/(1000*60*60*24));
}
}
