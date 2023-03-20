// SPDX-License-Identifier: AML
//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// 2019 OKIMS

pragma solidity ^0.8.0;

library Pairing {
    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct G1Point {
        uint256 X;
        uint256 Y;
    }

    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint256[2] X;
        uint256[2] Y;
    }

    /*
     * @return The negation of p, i.e. p.plus(p.negate()) should be zero.
     */
    function negate(G1Point memory p) internal pure returns (G1Point memory) {
        // The prime q in the base field F_q for G1
        if (p.X == 0 && p.Y == 0) {
            return G1Point(0, 0);
        } else {
            return G1Point(p.X, PRIME_Q - (p.Y % PRIME_Q));
        }
    }

    /*
     * @return The sum of two points of G1
     */
    function plus(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint256[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }
        }

        require(success, "pairing-add-failed");
    }

    /*
     * Same as plus but accepts raw input instead of struct
     * @return The sum of two points of G1, one is represented as array
     */
    function plus_raw(uint256[4] memory input, G1Point memory r) internal view {
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }
        }

        require(success, "pairing-add-failed");
    }

    /*
     * @return The product of a point on G1 and a scalar, i.e.
     *         p == p.scalar_mul(1) and p.plus(p) == p.scalar_mul(2) for all
     *         points p.
     */
    function scalar_mul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {
        uint256[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }
        }
        require(success, "pairing-mul-failed");
    }

    /*
     * Same as scalar_mul but accepts raw input instead of struct,
     * Which avoid extra allocation. provided input can be allocated outside and re-used multiple times
     */
    function scalar_mul_raw(uint256[3] memory input, G1Point memory r) internal view {
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }
        }
        require(success, "pairing-mul-failed");
    }

    /* @return The result of computing the pairing check
     *         e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
     *         For example,
     *         pairing([P1(), P1().negate()], [P2(), P2()]) should return true.
     */
    function pairing(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2,
        G1Point memory d1,
        G2Point memory d2
    ) internal view returns (bool) {
        G1Point[4] memory p1 = [a1, b1, c1, d1];
        G2Point[4] memory p2 = [a2, b2, c2, d2];
        uint256 inputSize = 24;
        uint256[] memory input = new uint256[](inputSize);

        for (uint256 i = 0; i < 4; i++) {
            uint256 j = i * 6;
            input[j + 0] = p1[i].X;
            input[j + 1] = p1[i].Y;
            input[j + 2] = p2[i].X[0];
            input[j + 3] = p2[i].X[1];
            input[j + 4] = p2[i].Y[0];
            input[j + 5] = p2[i].Y[1];
        }

        uint256[1] memory out;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }
        }

        require(success, "pairing-opcode-failed");

        return out[0] != 0;
    }
}

contract Ed25519Verifier {
    using Pairing for *;

    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct VerifyingKey {
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        // []G1Point IC (K in gnark) appears directly in verifyProof
    }

    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alfa1 = Pairing.G1Point(
            uint256(14057175494826583359056345414003059211259269882643518195364632328085876298585),
            uint256(12916429454348113693205704334188880631647746128909262146812651874845480685126)
        );
        vk.beta2 = Pairing.G2Point(
            [
                uint256(7407763146418858168663131371597544339134281377281564485494397978584274271562),
                uint256(6903801358582836974232257946616684180593905968803420765460017933435831494060)
            ],
            [
                uint256(679821764438052161272911913576696600681236408006690892229600962302987366325),
                uint256(11130334392622439871657809578518111694973158503886039570120105691250689932440)
            ]
        );
        vk.gamma2 = Pairing.G2Point(
            [
                uint256(2158536722826814282248642841144734285936562737037752645439947717264406838498),
                uint256(19873574163634514406635195126901707830999232711661120287467872670051998410557)
            ],
            [
                uint256(6828623064959355764393918857749435616022036449066446534946472888742424441590),
                uint256(16019150403641103091624051718540430127980351143502610533241517463304913799289)
            ]
        );
        vk.delta2 = Pairing.G2Point(
            [
                uint256(19383181621709337717995727437081003317746555737611445261223592476876172675264),
                uint256(19673568178422115206873302834394980288595607272387297636983948952891969524176)
            ],
            [
                uint256(13098252646352703513447836649438139602942995263320165511247242692691806776042),
                uint256(10748733669234547670582282347591017396962869412017196621070227010043643614270)
            ]
        );
    }

    // accumulate scalarMul(mul_input) into q
    // that is computes sets q = (mul_input[0:2] * mul_input[3]) + q
    function accumulate(
        uint256[3] memory mul_input,
        Pairing.G1Point memory p,
        uint256[4] memory buffer,
        Pairing.G1Point memory q
    ) internal view {
        // computes p = mul_input[0:2] * mul_input[3]
        Pairing.scalar_mul_raw(mul_input, p);

        // point addition inputs
        buffer[0] = q.X;
        buffer[1] = q.Y;
        buffer[2] = p.X;
        buffer[3] = p.Y;

        // q = p + q
        Pairing.plus_raw(buffer, q);
    }

    /*
     * @returns Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[56] calldata input
    ) public view returns (bool r) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);

        // Make sure that proof.A, B, and C are each less than the prime q
        require(proof.A.X < PRIME_Q, "verifier-aX-gte-prime-q");
        require(proof.A.Y < PRIME_Q, "verifier-aY-gte-prime-q");

        require(proof.B.X[0] < PRIME_Q, "verifier-bX0-gte-prime-q");
        require(proof.B.Y[0] < PRIME_Q, "verifier-bY0-gte-prime-q");

        require(proof.B.X[1] < PRIME_Q, "verifier-bX1-gte-prime-q");
        require(proof.B.Y[1] < PRIME_Q, "verifier-bY1-gte-prime-q");

        require(proof.C.X < PRIME_Q, "verifier-cX-gte-prime-q");
        require(proof.C.Y < PRIME_Q, "verifier-cY-gte-prime-q");

        // Make sure that every input is less than the snark scalar field
        for (uint256 i = 0; i < input.length; i++) {
            require(input[i] < SNARK_SCALAR_FIELD, "verifier-gte-snark-scalar-field");
        }

        VerifyingKey memory vk = verifyingKey();

        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);

        // Buffer reused for addition p1 + p2 to avoid memory allocations
        // [0:2] -> p1.X, p1.Y ; [2:4] -> p2.X, p2.Y
        uint256[4] memory add_input;

        // Buffer reused for multiplication p1 * s
        // [0:2] -> p1.X, p1.Y ; [3] -> s
        uint256[3] memory mul_input;

        // temporary point to avoid extra allocations in accumulate
        Pairing.G1Point memory q = Pairing.G1Point(0, 0);

        vk_x.X = uint256(18217648608396097035862150375637910518545948994706260631489835364833438653949); // vk.K[0].X
        vk_x.Y = uint256(11262619961774143324558828872567807120021034303910160712576549570384208098665); // vk.K[0].Y
        mul_input[0] = uint256(10652938338530199409532877836540465149879830980524173396461999182878124712974); // vk.K[1].X
        mul_input[1] = uint256(17515325737413504244231188489786293571648757727217073204412815028801118724716); // vk.K[1].Y
        mul_input[2] = input[0];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[1] * input[0]
        mul_input[0] = uint256(7683354770239960522386342656678473102450329221324226092913055776702423305088); // vk.K[2].X
        mul_input[1] = uint256(17452024104332124788548694957938148553822954906286994557111356054450096389511); // vk.K[2].Y
        mul_input[2] = input[1];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[2] * input[1]
        mul_input[0] = uint256(8075931806827163014095726921454598335265147521918882189546012627365282288360); // vk.K[3].X
        mul_input[1] = uint256(3983590172793999913348454846160728524768555188740651661601986478242903517753); // vk.K[3].Y
        mul_input[2] = input[2];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[3] * input[2]
        mul_input[0] = uint256(21278138203455726651154684535301185457413563494807112352773604278414146365236); // vk.K[4].X
        mul_input[1] = uint256(401298575282266699238430769471660322674719678160056238217767018028982854932); // vk.K[4].Y
        mul_input[2] = input[3];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[4] * input[3]
        mul_input[0] = uint256(2357840691052424594693511405264826773638863453689630325504608594505708484953); // vk.K[5].X
        mul_input[1] = uint256(15434799777462177653796511305266857481796367012891056213563785460547914855627); // vk.K[5].Y
        mul_input[2] = input[4];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[5] * input[4]
        mul_input[0] = uint256(21485047597789014792633890053448741776827168075467441455911409808143016877498); // vk.K[6].X
        mul_input[1] = uint256(21720327874213362558063947754776162762749139537933510862524279666232098457367); // vk.K[6].Y
        mul_input[2] = input[5];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[6] * input[5]
        mul_input[0] = uint256(20620760744602599675205009333384060853983812330828732515455330490468765747941); // vk.K[7].X
        mul_input[1] = uint256(2540105212894593945772562299324084587156383821448424473474957178821299775957); // vk.K[7].Y
        mul_input[2] = input[6];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[7] * input[6]
        mul_input[0] = uint256(10087264412035464224735303788576655005524650794728699297515377419527751915463); // vk.K[8].X
        mul_input[1] = uint256(20386314811123124933972920303260577097001374374211908120228254477770113806707); // vk.K[8].Y
        mul_input[2] = input[7];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[8] * input[7]
        mul_input[0] = uint256(19169536326282517426749151989775721882630729526910253755176875713047744373327); // vk.K[9].X
        mul_input[1] = uint256(531785865674518532061249747162608905537511954099389632862177764398649059530); // vk.K[9].Y
        mul_input[2] = input[8];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[9] * input[8]
        mul_input[0] = uint256(20428770378938917166658708617528379298824569351971682223447655046244309358763); // vk.K[10].X
        mul_input[1] = uint256(15662345388465747796514572482182622957732638967029071915082529117239819991105); // vk.K[10].Y
        mul_input[2] = input[9];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[10] * input[9]
        mul_input[0] = uint256(2228443246125984578882787010945143598910758295450896098192364449912658521779); // vk.K[11].X
        mul_input[1] = uint256(12602018083924340539068125115514297021495809206793542733833678380834138355721); // vk.K[11].Y
        mul_input[2] = input[10];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[11] * input[10]
        mul_input[0] = uint256(21494553898713549236696960646035374949820355684866145374199469385558901988483); // vk.K[12].X
        mul_input[1] = uint256(15595221127683988528701870047521853823415616683894869509637802544763925361626); // vk.K[12].Y
        mul_input[2] = input[11];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[12] * input[11]
        mul_input[0] = uint256(6471546502904623047507113454158783170724255347598851079405466417655171394280); // vk.K[13].X
        mul_input[1] = uint256(9601966457532433484627122714243648543543385293943399154463055896486281319316); // vk.K[13].Y
        mul_input[2] = input[12];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[13] * input[12]
        mul_input[0] = uint256(1956174125011385887363046813504757048035270006129264472202778287391382547537); // vk.K[14].X
        mul_input[1] = uint256(21212868618739631993397440459507312218133349158671616953250068347842369616610); // vk.K[14].Y
        mul_input[2] = input[13];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[14] * input[13]
        mul_input[0] = uint256(12654262891502745716021960640812217040963547013797823454656404715092337678925); // vk.K[15].X
        mul_input[1] = uint256(2760489357222180516055874964330456153824443478510585020560719513803375499311); // vk.K[15].Y
        mul_input[2] = input[14];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[15] * input[14]
        mul_input[0] = uint256(4337828256731121848136644038018956792201863094319162899241596509672476705646); // vk.K[16].X
        mul_input[1] = uint256(18622377809911941142917540438719097997860956665090723956133275032746235844366); // vk.K[16].Y
        mul_input[2] = input[15];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[16] * input[15]
        mul_input[0] = uint256(14082594246553591986317412852408567752880082258592625950448378387651267251482); // vk.K[17].X
        mul_input[1] = uint256(9173223388937384357708825329766592804005620777605271637151362430059326938341); // vk.K[17].Y
        mul_input[2] = input[16];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[17] * input[16]
        mul_input[0] = uint256(9826472788552932015837522919473078571139572553850728785253338447043098907560); // vk.K[18].X
        mul_input[1] = uint256(9528186371300477822169658729749982755102369491809838346690988544615749187923); // vk.K[18].Y
        mul_input[2] = input[17];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[18] * input[17]
        mul_input[0] = uint256(8301632014738117644942962050035988113184384995336902343345190987289435120846); // vk.K[19].X
        mul_input[1] = uint256(3708261847538689719337727193597638759434216436731700900829337354325247945488); // vk.K[19].Y
        mul_input[2] = input[18];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[19] * input[18]
        mul_input[0] = uint256(9559279144972181671725250116049951130738350702315194118358961691890444561153); // vk.K[20].X
        mul_input[1] = uint256(1453935451821531554569396227105188727392633925230319661519721863397964938592); // vk.K[20].Y
        mul_input[2] = input[19];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[20] * input[19]
        mul_input[0] = uint256(18173339263152845647746869295383931305756248118418668156996802268820695193574); // vk.K[21].X
        mul_input[1] = uint256(16380440538516122123253342336767476108508615881515322037318505382821081928485); // vk.K[21].Y
        mul_input[2] = input[20];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[21] * input[20]
        mul_input[0] = uint256(15241666186836462335979087163753743916430432940289745318399258749920560491062); // vk.K[22].X
        mul_input[1] = uint256(14705520920550615359808912761177641844199508976825161412311849612172469548835); // vk.K[22].Y
        mul_input[2] = input[21];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[22] * input[21]
        mul_input[0] = uint256(6499121073284383959500566076195633814069626662771167265066997372139296944314); // vk.K[23].X
        mul_input[1] = uint256(11079553230444698307318354380323200682877867972561686525494304820608554856811); // vk.K[23].Y
        mul_input[2] = input[22];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[23] * input[22]
        mul_input[0] = uint256(6989146603932522861662353370014140443786454359931287226614845485676180465844); // vk.K[24].X
        mul_input[1] = uint256(1923164373790139774413333795787407598067503304664043469093571557846906758460); // vk.K[24].Y
        mul_input[2] = input[23];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[24] * input[23]
        mul_input[0] = uint256(17648665723643010676938430740723330671983298501835437240743609007211477946456); // vk.K[25].X
        mul_input[1] = uint256(15026900187229347838234976693282744820624908336154803947398854365341873271443); // vk.K[25].Y
        mul_input[2] = input[24];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[25] * input[24]
        mul_input[0] = uint256(19689361488539107122340374911736479517300072915319901833287635782739080645052); // vk.K[26].X
        mul_input[1] = uint256(19065635050056479467634677218414540634042818934397520434678365280872733611735); // vk.K[26].Y
        mul_input[2] = input[25];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[26] * input[25]
        mul_input[0] = uint256(6497219386096192245785186499439171617558734933214674407817309717808806855681); // vk.K[27].X
        mul_input[1] = uint256(15666257310616227405864916664926944182485658785204773777059224954057904032986); // vk.K[27].Y
        mul_input[2] = input[26];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[27] * input[26]
        mul_input[0] = uint256(4873897165388441122496527843964520885807783784946408138254507197309317106404); // vk.K[28].X
        mul_input[1] = uint256(20765804979230650256459458239674811771618515703534610179851400694295345358215); // vk.K[28].Y
        mul_input[2] = input[27];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[28] * input[27]
        mul_input[0] = uint256(9488803270475863885515903382586503472892194149050676876234811130568107378495); // vk.K[29].X
        mul_input[1] = uint256(8878315861947282911583526024550338550808979403026255885013371378702853982007); // vk.K[29].Y
        mul_input[2] = input[28];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[29] * input[28]
        mul_input[0] = uint256(7440609566463311169785102103387688702158389482480637572537308916863324830308); // vk.K[30].X
        mul_input[1] = uint256(7930679592275962761396152800627683532786654486439229685600328322875014031250); // vk.K[30].Y
        mul_input[2] = input[29];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[30] * input[29]
        mul_input[0] = uint256(232649335560102457800521701728402724287880388293196404303097732546351549583); // vk.K[31].X
        mul_input[1] = uint256(2759505964345836072618918708438039817598320707336976805910447192797957741114); // vk.K[31].Y
        mul_input[2] = input[30];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[31] * input[30]
        mul_input[0] = uint256(19251400591126173338701907779188427897660324086231915720192924996355734898255); // vk.K[32].X
        mul_input[1] = uint256(6959906126073127527669950680256049700797006390471596593546375615656322649981); // vk.K[32].Y
        mul_input[2] = input[31];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[32] * input[31]
        mul_input[0] = uint256(6323235748021590156104947984630227960786411655060203273255957369798619820251); // vk.K[33].X
        mul_input[1] = uint256(11574957003181139281603195622561392156156748435513989003085469764418320396657); // vk.K[33].Y
        mul_input[2] = input[32];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[33] * input[32]
        mul_input[0] = uint256(11684448551856480965258812982549419105635346364849138808076338969251276216796); // vk.K[34].X
        mul_input[1] = uint256(13933878782059327174728948889851767308358544497780455068541697781832941306911); // vk.K[34].Y
        mul_input[2] = input[33];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[34] * input[33]
        mul_input[0] = uint256(2003988668101632724128231954279336768004418939609516194357315357385801059421); // vk.K[35].X
        mul_input[1] = uint256(2120750051410331153942967744089686225065714977449006207259365482540852099142); // vk.K[35].Y
        mul_input[2] = input[34];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[35] * input[34]
        mul_input[0] = uint256(9011637999747416119849645905985934856619852661745877646340615309122974740053); // vk.K[36].X
        mul_input[1] = uint256(4917019021177224630518766929866112820485161082788709849932928059739556791443); // vk.K[36].Y
        mul_input[2] = input[35];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[36] * input[35]
        mul_input[0] = uint256(7525122992760387003660994362364898083711810651132351710342601711818769969090); // vk.K[37].X
        mul_input[1] = uint256(7627602793665527871748000118865157753254537334778364070510241590363798583434); // vk.K[37].Y
        mul_input[2] = input[36];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[37] * input[36]
        mul_input[0] = uint256(11196825587810377886465411253147894352693003356946010742411455137460778170120); // vk.K[38].X
        mul_input[1] = uint256(5891748961853709229967419460369947524896971070340952416103554293559246930496); // vk.K[38].Y
        mul_input[2] = input[37];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[38] * input[37]
        mul_input[0] = uint256(14522859370404416575827920314267761031323854760000306017039282035393053392209); // vk.K[39].X
        mul_input[1] = uint256(3845074615668592277896326388173848045327362759213375763681474251277708244977); // vk.K[39].Y
        mul_input[2] = input[38];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[39] * input[38]
        mul_input[0] = uint256(15450299570098150935828805168473107294906150378188888245357727831765582187290); // vk.K[40].X
        mul_input[1] = uint256(1907272214357145244443145617346399723646643436113874328967293051292760440112); // vk.K[40].Y
        mul_input[2] = input[39];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[40] * input[39]
        mul_input[0] = uint256(6985857747011095998743203140713277771282061263373878961235529052106170613330); // vk.K[41].X
        mul_input[1] = uint256(10139952670928311858818709751280826537303467760767843915484772224186828124866); // vk.K[41].Y
        mul_input[2] = input[40];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[41] * input[40]
        mul_input[0] = uint256(14612636207734741852590240624519752174846701930035765837156639747603003437322); // vk.K[42].X
        mul_input[1] = uint256(14101406283059309729289823964879038027021465999612018500729487244260912580929); // vk.K[42].Y
        mul_input[2] = input[41];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[42] * input[41]
        mul_input[0] = uint256(17305447563556852112233312194001624291299254647662526160689215822543207620187); // vk.K[43].X
        mul_input[1] = uint256(9686292025015978050137966766422616339468711950353757280844515010410441484055); // vk.K[43].Y
        mul_input[2] = input[42];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[43] * input[42]
        mul_input[0] = uint256(17122088360844932968010778497712500180262770866427463525846320306164974094743); // vk.K[44].X
        mul_input[1] = uint256(7514192617017934233122620480676622598135705735951217889313628079079585897436); // vk.K[44].Y
        mul_input[2] = input[43];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[44] * input[43]
        mul_input[0] = uint256(4836750495055045960506271170862264241466340153560240101487733825958359635621); // vk.K[45].X
        mul_input[1] = uint256(19877906191471768916158781939812993879845213550281718240368211505446107980135); // vk.K[45].Y
        mul_input[2] = input[44];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[45] * input[44]
        mul_input[0] = uint256(10306109325460699971689348996111488976243132512743176885329563030227731382434); // vk.K[46].X
        mul_input[1] = uint256(15114159792615650314183165290021165430623996509389465811619055771803323467147); // vk.K[46].Y
        mul_input[2] = input[45];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[46] * input[45]
        mul_input[0] = uint256(18683226309533043051484594651067857372511609402960258960171128696607028880533); // vk.K[47].X
        mul_input[1] = uint256(2757669184492123216968332556558389037537327114041817240461796682372192026470); // vk.K[47].Y
        mul_input[2] = input[46];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[47] * input[46]
        mul_input[0] = uint256(5309775948615486351018826454599427734283232089470443610840178230181375796319); // vk.K[48].X
        mul_input[1] = uint256(16715541178836953872979436857278340940785759138500192519449476137506110553748); // vk.K[48].Y
        mul_input[2] = input[47];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[48] * input[47]
        mul_input[0] = uint256(15257107088018550103896451187792176812992687560319105158650306917562750831304); // vk.K[49].X
        mul_input[1] = uint256(3814455552635174882891296533693322296609895527247425104038520933868597830238); // vk.K[49].Y
        mul_input[2] = input[48];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[49] * input[48]
        mul_input[0] = uint256(5427916476747598684659404801689228641573754271880736296634792660512911592567); // vk.K[50].X
        mul_input[1] = uint256(1386983454201835122680815852074216792414960876571213949651104136231736185090); // vk.K[50].Y
        mul_input[2] = input[49];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[50] * input[49]
        mul_input[0] = uint256(13022202627474328628549617312265789400385018502560907493342872173165944899781); // vk.K[51].X
        mul_input[1] = uint256(11914406457685747932763226077228303432346087552215747387150662919900462071169); // vk.K[51].Y
        mul_input[2] = input[50];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[51] * input[50]
        mul_input[0] = uint256(1535033523538405401978884564425298873455471708179811829730065921494501215965); // vk.K[52].X
        mul_input[1] = uint256(1250169375409006762091674351605277058463110177721148617273582651657685875873); // vk.K[52].Y
        mul_input[2] = input[51];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[52] * input[51]
        mul_input[0] = uint256(18000121848174443673099859624302655080156342338618205311252551290764285046315); // vk.K[53].X
        mul_input[1] = uint256(6968822893242177048006972887066524711808415093970580495206012394887681124850); // vk.K[53].Y
        mul_input[2] = input[52];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[53] * input[52]
        mul_input[0] = uint256(11500395185736145503278529928638107139680665925889820205360403742308640781546); // vk.K[54].X
        mul_input[1] = uint256(1480412288581500256363867971860922025376378542364912994693752118610528782804); // vk.K[54].Y
        mul_input[2] = input[53];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[54] * input[53]
        mul_input[0] = uint256(14931572023224190592766745326444832995167581874802259853880037857445816284040); // vk.K[55].X
        mul_input[1] = uint256(1411604071617715483893269898380061205259432842648329187704734952820018548388); // vk.K[55].Y
        mul_input[2] = input[54];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[55] * input[54]
        mul_input[0] = uint256(6428532914354722096030163581248475969181308814829946328204172275134119235165); // vk.K[56].X
        mul_input[1] = uint256(21568250982917889191997302061976208799038069984502625535764137944464366884263); // vk.K[56].Y
        mul_input[2] = input[55];
        accumulate(mul_input, q, add_input, vk_x); // vk_x += vk.K[56] * input[55]

        return
            Pairing.pairing(Pairing.negate(proof.A), proof.B, vk.alfa1, vk.beta2, vk_x, vk.gamma2, proof.C, vk.delta2);
    }
}
