// 졸업 직전 진로 분포 (선택권 §8). 운에 맡기기와 동기 정책이 쓴다.
import { ASSUMED } from '../assumed';
import { get, type DataBundle } from '../data/bundle';
import { permanentShare, postdocFunders } from '../data/statistics';
import type { Group, Ksced, Path } from '../types';

type NonStartup = Exclude<Path, 'startup'>;

// 비정규직(박사후 등) 일자리의 경로 배분 F_r: 이공 = 박사후 재원 비율, 인문사회 = assumed(0014#74)
function nonRegularShare(data: DataBundle, group: Group): Record<NonStartup, number> {
  if (group === '인문사회') return { ...ASSUMED.HUMSOC_NONREG_PATH };
  const f = postdocFunders(data);
  return {
    academia: f.university.value + f.other.value,
    public: f.government.value + f['public-institute'].value,
    industry: f['private-institute'].value + f['private-company'].value,
  };
}

/**
 * P(창업) = w_self, P(경로 r) = (1 − w_self)·[perm_f·A_r + (1 − perm_f)·F_r] (선택권 §8).
 * w_self = 비임금근로자 비율(0014#77), perm_f = 계열 f 의 상용직 비율 4년 합산판(0014#76), A_r = 정규직 배분(0014#75).
 */
export function pathDistribution(data: DataBundle, ksced: Ksced, group: Group): Record<Path, number> {
  const wSelf = get(data, ASSUMED.STARTUP_P_RECORD).value;
  const perm = permanentShare(data, ksced).value;
  const A = ASSUMED.PERM_PATH[group];
  const F = nonRegularShare(data, group);
  const at = (r: NonStartup): number => (1 - wSelf) * (perm * A[r] + (1 - perm) * F[r]);
  return { academia: at('academia'), industry: at('industry'), public: at('public'), startup: wSelf };
}
